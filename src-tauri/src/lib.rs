mod media;

use media::{MediaAction, SongInfo};

#[tauri::command]
fn check_music() -> SongInfo {
    media::get_song_info()
}

#[tauri::command]
fn control_media(action: MediaAction) {
    media::send_control(action);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![check_music, control_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
