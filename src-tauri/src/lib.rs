mod media;

use media::{MediaAction, SongInfo};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[tauri::command]
fn check_music() -> SongInfo {
    media::get_song_info()
}

#[tauri::command]
fn control_media(action: MediaAction) {
    media::send_control(action);
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
        .invoke_handler(tauri::generate_handler![check_music, control_media])
        .setup(|app| {
            let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide", true, None::<&str>)?;
            let prev = MenuItem::with_id(app, "prev", "Previous", true, None::<&str>)?;
            let play_pause =
                MenuItem::with_id(app, "play_pause", "Play/Pause", true, None::<&str>)?;
            let next = MenuItem::with_id(app, "next", "Next", true, None::<&str>)?;
            let always_on_top = CheckMenuItem::with_id(
                app,
                "always_on_top",
                "Always on Top",
                true,
                true,
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
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;

            let always_on_top_item = always_on_top.clone();

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

            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("bundle.icon must be set in tauri.conf.json"),
                )
                .menu(&menu)
                .tooltip("AeroGlass")
                .show_menu_on_left_click(false)
                .on_menu_event(move |app_handle, event| match event.id.0.as_str() {
                    "show_hide" => toggle_window_visibility(app_handle),
                    "prev" => media::send_control(MediaAction::Prev),
                    "play_pause" => media::send_control(MediaAction::PlayPause),
                    "next" => media::send_control(MediaAction::Next),
                    "always_on_top" => {
                        if let (Ok(checked), Some(window)) = (
                            always_on_top_item.is_checked(),
                            app_handle.get_webview_window("main"),
                        ) {
                            stay_on_top.store(checked, Ordering::Relaxed);
                            let _ = window.set_always_on_top(checked);
                        }
                    }
                    "quit" => app_handle.exit(0),
                    _ => {}
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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
