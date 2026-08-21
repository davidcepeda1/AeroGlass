mod media;

use media::{MediaAction, SongInfo};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
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
