use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};

/// Identifier of the session the widget should follow when more than one
/// app is playing audio at once — an MPRIS bus name on Linux, a
/// `SourceAppUserModelId` on Windows. `None` means "no explicit choice",
/// falling back to each backend's own "most likely" pick.
fn selected_session() -> &'static Mutex<Option<String>> {
    static CELL: OnceLock<Mutex<Option<String>>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new(None))
}

pub fn get_active_session() -> Option<String> {
    selected_session().lock().unwrap().clone()
}

pub fn set_active_session(id: Option<String>) {
    *selected_session().lock().unwrap() = id;
}

/// One entry in the "which app is playing audio right now" list, shown to
/// the user when picking a session to follow.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    /// Stable identifier to pass back to `set_active_session`.
    pub id: String,
    /// Human-readable label.
    pub name: String,
}

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
pub use windows::{get_song_info, list_sessions, send_control, watch_song_changes};

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::{get_song_info, list_sessions, send_control, watch_song_changes};
