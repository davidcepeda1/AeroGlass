use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SongInfo {
    pub title: String,
    pub artist: String,
    pub is_playing: bool,
    /// Album art as something an `<img>` tag can use directly: an http(s)
    /// URL, or a `data:` URI when the source only exposes raw image bytes.
    pub cover_art: Option<String>,
}

impl SongInfo {
    /// Neutral state used when there is no active media session, so the UI
    /// doesn't break waiting for data that will never arrive.
    pub fn none() -> Self {
        SongInfo {
            title: String::new(),
            artist: String::new(),
            is_playing: false,
            cover_art: None,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MediaAction {
    PlayPause,
    Next,
    Prev,
}

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::{get_song_info, send_control, watch_song_changes};

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::{get_song_info, send_control, watch_song_changes};
