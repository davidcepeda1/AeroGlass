use super::{MediaAction, SongInfo};
use mpris::{PlaybackStatus, Player, PlayerFinder};

fn active_player() -> Option<Player> {
    let finder = PlayerFinder::new().ok()?;
    finder.find_active().or_else(|_| finder.find_first()).ok()
}

pub fn get_song_info() -> SongInfo {
    let Some(player) = active_player() else {
        return SongInfo::none();
    };

    let metadata = player.get_metadata().ok();

    let title = metadata
        .as_ref()
        .and_then(|m| m.title())
        .unwrap_or("Unknown title")
        .to_string();

    let artist = metadata
        .as_ref()
        .and_then(|m| m.artists())
        .map(|artists| artists.join(", "))
        .unwrap_or_else(|| "Unknown artist".to_string());

    let is_playing = player
        .get_playback_status()
        .map(|status| status == PlaybackStatus::Playing)
        .unwrap_or(false);

    SongInfo {
        title,
        artist,
        is_playing,
    }
}

pub fn send_control(action: MediaAction) {
    let Some(player) = active_player() else {
        return;
    };

    let _ = match action {
        MediaAction::PlayPause => player.play_pause(),
        MediaAction::Next => player.next(),
        MediaAction::Prev => player.previous(),
    };
}
