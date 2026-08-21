use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SongInfo {
    title: String,
    artist: String,
    is_playing: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum MediaAction {
    PlayPause,
    Next,
    Prev,
}

#[tauri::command]
fn check_music() -> SongInfo {
    SongInfo {
        title: "Mock Song".into(),
        artist: "Mock Artist".into(),
        is_playing: true,
    }
}

#[tauri::command]
fn control_media(action: MediaAction) {
    let label = match action {
        MediaAction::PlayPause => "play_pause",
        MediaAction::Next => "next",
        MediaAction::Prev => "prev",
    };
    println!("control_media: {label}");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![check_music, control_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
