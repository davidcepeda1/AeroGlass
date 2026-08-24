use super::{MediaAction, SessionSummary, SongInfo};
use base64::{engine::general_purpose::STANDARD, Engine};
use tauri::{AppHandle, Emitter};
use windows::Foundation::TypedEventHandler;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Storage::Streams::DataReader;

fn manager() -> Option<GlobalSystemMediaTransportControlsSessionManager> {
    GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .ok()?
        .join()
        .ok()
}

fn current_session() -> Option<GlobalSystemMediaTransportControlsSession> {
    let manager = manager()?;

    // An explicit choice (multiple apps playing at once) wins, but only if
    // that session is still there — a session that quit falls back to
    // whatever WinRT itself considers current, instead of the widget going
    // blank.
    if let Some(id) = super::get_active_session() {
        if let Ok(sessions) = manager.GetSessions() {
            for session in sessions {
                if session
                    .SourceAppUserModelId()
                    .map(|s| s.to_string())
                    .unwrap_or_default()
                    == id
                {
                    return Some(session);
                }
            }
        }
    }

    manager.GetCurrentSession().ok()
}

/// Every app currently exposing a media session, for the session picker —
/// independent of playback state, so a paused app still shows up as a
/// choice.
pub fn list_sessions() -> Vec<SessionSummary> {
    let Some(manager) = manager() else {
        return Vec::new();
    };
    let Ok(sessions) = manager.GetSessions() else {
        return Vec::new();
    };

    sessions
        .into_iter()
        .filter_map(|s| {
            let id = s.SourceAppUserModelId().ok()?.to_string();
            Some(SessionSummary {
                name: id.clone(),
                id,
            })
        })
        .collect()
}

/// The Windows Media Session API only hands back raw thumbnail bytes (no
/// URL), so read the stream ourselves and inline it as a `data:` URI.
fn resolve_cover_art(
    properties: &GlobalSystemMediaTransportControlsSessionMediaProperties,
) -> Option<String> {
    let thumbnail = properties.Thumbnail().ok()?;
    let stream = thumbnail.OpenReadAsync().ok()?.join().ok()?;

    let size = stream.Size().ok()?;
    if size == 0 || size > 8 * 1024 * 1024 {
        return None;
    }

    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size as u32).ok()?.join().ok()?;

    let mut buffer = vec![0u8; size as usize];
    reader.ReadBytes(&mut buffer).ok()?;

    let mime = stream
        .ContentType()
        .map(|s| s.to_string())
        .unwrap_or_default();
    let mime = if mime.is_empty() { "image/png" } else { &mime };

    Some(format!("data:{mime};base64,{}", STANDARD.encode(buffer)))
}

pub fn get_song_info() -> SongInfo {
    let Some(session) = current_session() else {
        return SongInfo::none();
    };

    let properties = session
        .TryGetMediaPropertiesAsync()
        .ok()
        .and_then(|op| op.join().ok());

    let title = properties
        .as_ref()
        .and_then(|p| p.Title().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let artist = properties
        .as_ref()
        .and_then(|p| p.Artist().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let cover_art = properties.as_ref().and_then(resolve_cover_art);

    let is_playing = session
        .GetPlaybackInfo()
        .ok()
        .and_then(|info| info.PlaybackStatus().ok())
        .map(|status| status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
        .unwrap_or(false);

    SongInfo {
        title,
        artist,
        is_playing,
        cover_art,
    }
}

/// Pushes a `song-changed` event with fresh `SongInfo` whenever WinRT
/// reports something relevant, instead of making the frontend poll on a
/// timer: `MediaPropertiesChanged`/`PlaybackInfoChanged` on the current
/// session, and `CurrentSessionChanged` on the manager itself (re-subscribes
/// to whichever session becomes active, e.g. switching from Spotify to a
/// browser tab).
pub fn watch_song_changes(app: AppHandle) {
    std::thread::spawn(move || {
        if let Err(err) = run(app) {
            eprintln!("aeroglass: WinRT session events unavailable ({err:?})");
        }
    });
}

fn subscribe_session(
    session: &GlobalSystemMediaTransportControlsSession,
    app: AppHandle,
) -> windows::core::Result<()> {
    let app_props = app.clone();
    session.MediaPropertiesChanged(&TypedEventHandler::new(move |_, _| {
        let _ = app_props.emit("song-changed", get_song_info());
        Ok(())
    }))?;

    session.PlaybackInfoChanged(&TypedEventHandler::new(move |_, _| {
        let _ = app.emit("song-changed", get_song_info());
        Ok(())
    }))?;

    Ok(())
}

fn run(app: AppHandle) -> windows::core::Result<()> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.join()?;

    if let Ok(session) = manager.GetCurrentSession() {
        let _ = subscribe_session(&session, app.clone());
    }
    // Push current state immediately so the frontend doesn't sit on stale
    // data until the next actual change.
    let _ = app.emit("song-changed", get_song_info());

    let manager_for_change = manager.clone();
    let app_for_change = app.clone();
    manager.CurrentSessionChanged(&TypedEventHandler::new(move |_, _| {
        if let Ok(session) = manager_for_change.GetCurrentSession() {
            let _ = subscribe_session(&session, app_for_change.clone());
        }
        let _ = app_for_change.emit("song-changed", get_song_info());
        Ok(())
    }))?;

    // Keep the manager (and therefore its event registrations) alive.
    loop {
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}

pub fn send_control(action: MediaAction) {
    let Some(session) = current_session() else {
        return;
    };

    let result = match action {
        MediaAction::PlayPause => session.TryTogglePlayPauseAsync(),
        MediaAction::Next => session.TrySkipNextAsync(),
        MediaAction::Prev => session.TrySkipPreviousAsync(),
    };

    if let Ok(op) = result {
        let _ = op.join();
    }
}
