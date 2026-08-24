mod audio;
mod media;

use media::{MediaAction, SessionSummary, SongInfo};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WindowEvent,
};

#[tauri::command]
fn check_music() -> SongInfo {
    media::get_song_info()
}

#[tauri::command]
fn control_media(action: MediaAction) {
    media::send_control(action);
}

#[tauri::command]
fn list_sessions() -> Vec<SessionSummary> {
    media::list_sessions()
}

#[tauri::command]
fn set_active_session(id: Option<String>) {
    media::set_active_session(id);
}

const DEFAULT_VISUALIZER_STYLE: &str = "segmented";

fn visualizer_style_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("visualizer-style.txt"))
}

#[tauri::command]
fn get_visualizer_style(app: tauri::AppHandle) -> String {
    visualizer_style_path(&app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_VISUALIZER_STYLE.to_string())
}

#[tauri::command]
fn set_visualizer_style(app: tauri::AppHandle, style: String) {
    if let Some(path) = visualizer_style_path(&app) {
        let _ = std::fs::write(path, style);
    }
}

/// Builds the full tray menu from scratch, including the "Active Session"
/// submenu — only present when 2+ apps are playing audio at once, so a
/// single-session setup (the common case) never sees it. Rebuilding wholesale
/// on every change (instead of surgically inserting/removing a submenu from
/// a live native menu) sidesteps a class of platform-specific edge cases
/// around mutating menus in place, at the cost of a cheap full rebuild.
fn build_menu<R: Runtime>(
    app: &AppHandle<R>,
    stay_on_top: bool,
    sessions: &[SessionSummary],
    active_id: Option<&str>,
) -> tauri::Result<Menu<R>> {
    let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide", true, None::<&str>)?;
    let prev = MenuItem::with_id(app, "prev", "Previous", true, None::<&str>)?;
    let play_pause = MenuItem::with_id(app, "play_pause", "Play/Pause", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Next", true, None::<&str>)?;
    let always_on_top = CheckMenuItem::with_id(
        app,
        "always_on_top",
        "Always on Top",
        true,
        stay_on_top,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_hide,
            &PredefinedMenuItem::separator(app)?,
            &prev,
            &play_pause,
            &next,
            &PredefinedMenuItem::separator(app)?,
            &always_on_top,
        ],
    )?;

    // Only worth a picker once there's actually something to pick between —
    // one active session is the normal case and shouldn't show a menu for a
    // choice of one.
    if sessions.len() > 1 {
        let auto = CheckMenuItem::with_id(
            app,
            "session:auto",
            "Auto",
            true,
            active_id.is_none(),
            None::<&str>,
        )?;
        let mut items: Vec<Box<dyn tauri::menu::IsMenuItem<R>>> = vec![Box::new(auto)];
        items.push(Box::new(PredefinedMenuItem::separator(app)?));
        for session in sessions {
            items.push(Box::new(CheckMenuItem::with_id(
                app,
                format!("session:{}", session.id),
                &session.name,
                true,
                active_id == Some(session.id.as_str()),
                None::<&str>,
            )?));
        }
        let refs: Vec<&dyn tauri::menu::IsMenuItem<R>> =
            items.iter().map(|i| i.as_ref()).collect();
        let sessions_submenu = Submenu::with_items(app, "Active Session", true, &refs)?;

        menu.append(&PredefinedMenuItem::separator(app)?)?;
        menu.append(&sessions_submenu)?;
    }

    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&quit)?;

    Ok(menu)
}

fn toggle_window_visibility(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let is_visible = window.is_visible().unwrap_or(false);
    if is_visible {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // Native Wayland gives a client no real way to request "always on
        // top" — only the compositor decides stacking, and it always raises
        // whichever window last gained focus, so set_always_on_top is a
        // silent no-op there. Force GTK onto XWayland instead, where "keep
        // above" is a real X11 window state that KWin (and others) honor.
        // Must happen before GTK initializes, i.e. before Builder::default().
        std::env::set_var("GDK_BACKEND", "x11");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_music,
            control_media,
            get_visualizer_style,
            set_visualizer_style,
            list_sessions,
            set_active_session
        ])
        .setup(|app| {
            audio::start(app.handle().clone());
            media::watch_song_changes(app.handle().clone());

            let initial_sessions = media::list_sessions();
            let menu = build_menu(
                app.handle(),
                true,
                &initial_sessions,
                media::get_active_session().as_deref(),
            )?;

            // Holds the live tray icon once built below, so both the session
            // poll thread and the menu-click handler can swap in a freshly
            // rebuilt menu without needing to rebuild the tray itself.
            let tray_cell: Arc<StdMutex<Option<TrayIcon<_>>>> = Arc::new(StdMutex::new(None));

            // KWin (and other WMs) can silently drop "keep above" when the
            // window loses focus — re-assert it on every focus loss so the
            // widget never ends up stuck behind whatever app was switched to.
            let stay_on_top = Arc::new(AtomicBool::new(true));
            if let Some(window) = app.get_webview_window("main") {
                // Re-assert "keep above" on every focus loss (fires fastest
                // when the WM actually delivers it) *and* on a fixed 1s
                // timer (a blunt but reliable fallback for WMs — KWin
                // included — that can silently drop "keep above" without a
                // focus-loss event ever proving useful for it).
                let stay_on_top_for_event = stay_on_top.clone();
                let window_for_event = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        if stay_on_top_for_event.load(Ordering::Relaxed) {
                            let _ = window_for_event.set_always_on_top(true);
                        }
                    }
                });

                let stay_on_top_for_timer = stay_on_top.clone();
                std::thread::spawn(move || loop {
                    std::thread::sleep(std::time::Duration::from_secs(1));
                    if stay_on_top_for_timer.load(Ordering::Relaxed) {
                        let _ = window.set_always_on_top(true);
                    }
                });
            }

            // Rebuilds the menu from current state and swaps it into the live
            // tray icon — the one place that turns "something changed"
            // (session list, active pick, always-on-top toggle) into an
            // updated menu, called both from clicks and from the poll below.
            let refresh_tray = {
                let tray_cell = tray_cell.clone();
                let stay_on_top = stay_on_top.clone();
                let app_handle = app.handle().clone();
                move || {
                    let Some(tray) = tray_cell.lock().unwrap().clone() else {
                        return;
                    };
                    let sessions = media::list_sessions();
                    let active_id = media::get_active_session();
                    if let Ok(menu) = build_menu(
                        &app_handle,
                        stay_on_top.load(Ordering::Relaxed),
                        &sessions,
                        active_id.as_deref(),
                    ) {
                        let _ = tray.set_menu(Some(menu));
                    }
                }
            };

            // Session list can change any time an app starts/stops playing
            // audio — nothing pushes that as an event, so poll it on the
            // same "cheap and reliable" timer pattern already used for
            // always-on-top above, and only touch the tray when something
            // actually changed.
            {
                let refresh_tray = refresh_tray.clone();
                let mut last_ids: Vec<String> =
                    initial_sessions.iter().map(|s| s.id.clone()).collect();
                let mut last_active = media::get_active_session();
                std::thread::spawn(move || loop {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let ids: Vec<String> =
                        media::list_sessions().into_iter().map(|s| s.id).collect();
                    let mut active = media::get_active_session();

                    // The explicitly chosen session quit — don't leave the
                    // pick dangling on a bus name nothing will ever answer
                    // to again (especially likely for per-process bus names
                    // like `.instanceN`, which a relaunch won't reuse).
                    // Revert to auto, both so the menu's checkmark lands
                    // back on "Auto" instead of showing nothing checked,
                    // and so the state doesn't quietly leak forever.
                    if let Some(id) = &active {
                        if !ids.contains(id) {
                            media::set_active_session(None);
                            active = None;
                        }
                    }

                    if ids != last_ids || active != last_active {
                        last_ids = ids;
                        last_active = active;
                        refresh_tray();
                    }
                });
            }

            let tray = TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("bundle.icon must be set in tauri.conf.json"),
                )
                .menu(&menu)
                .tooltip("AeroGlass")
                .show_menu_on_left_click(false)
                .on_menu_event(move |app_handle, event| {
                    let id = event.id.0.as_str();
                    if let Some(session_id) = id.strip_prefix("session:") {
                        media::set_active_session(
                            (session_id != "auto").then(|| session_id.to_string()),
                        );
                        refresh_tray();
                        return;
                    }
                    match id {
                        "show_hide" => toggle_window_visibility(app_handle),
                        "prev" => media::send_control(MediaAction::Prev),
                        "play_pause" => media::send_control(MediaAction::PlayPause),
                        "next" => media::send_control(MediaAction::Next),
                        "always_on_top" => {
                            let checked = !stay_on_top.load(Ordering::Relaxed);
                            stay_on_top.store(checked, Ordering::Relaxed);
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.set_always_on_top(checked);
                            }
                            refresh_tray();
                        }
                        "quit" => app_handle.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window_visibility(tray.app_handle());
                    }
                })
                .build(app)?;

            *tray_cell.lock().unwrap() = Some(tray);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
