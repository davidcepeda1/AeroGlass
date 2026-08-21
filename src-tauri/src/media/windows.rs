use super::{MediaAction, SongInfo};
use base64::{engine::general_purpose::STANDARD, Engine};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Storage::Streams::DataReader;

fn current_session() -> Option<GlobalSystemMediaTransportControlsSession> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .ok()?
        .join()
        .ok()?;
    manager.GetCurrentSession().ok()
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
