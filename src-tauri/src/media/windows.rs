use super::{MediaAction, SongInfo};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

fn current_session() -> Option<GlobalSystemMediaTransportControlsSession> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .ok()?
        .join()
        .ok()?;
    manager.GetCurrentSession().ok()
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
