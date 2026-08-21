mod bands;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::start;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::start;

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub fn start(_app: tauri::AppHandle) {}
