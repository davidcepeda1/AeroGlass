mod bands;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::start;

/// Windows loopback capture (WASAPI) lands in a follow-up commit.
#[cfg(not(target_os = "linux"))]
pub fn start(_app: tauri::AppHandle) {}
