use super::{MediaAction, SongInfo};
use base64::{engine::general_purpose::STANDARD, Engine};
use mpris::{PlaybackStatus, Player, PlayerFinder};

fn active_player() -> Option<Player> {
    let finder = PlayerFinder::new().ok()?;
    finder.find_active().or_else(|_| finder.find_first()).ok()
}

fn guess_mime(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("").to_lowercase().as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    }
}

/// MPRIS' `mpris:artUrl` is usually an http(s) URL (Spotify, browsers) that
/// an `<img>` tag can use as-is, but players that cache art locally hand back
/// a `file://` path instead, which the webview can't load directly — read
/// those bytes ourselves and inline them as a `data:` URI.
fn resolve_cover_art(art_url: &str) -> Option<String> {
    if art_url.starts_with("http://") || art_url.starts_with("https://") {
        return Some(art_url.to_string());
    }

    let path = art_url.strip_prefix("file://")?;
    let bytes = std::fs::read(path).ok()?;
    let mime = guess_mime(path);
    Some(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
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

    let cover_art = metadata
        .as_ref()
        .and_then(|m| m.art_url())
        .and_then(resolve_cover_art);

    let is_playing = player
        .get_playback_status()
        .map(|status| status == PlaybackStatus::Playing)
        .unwrap_or(false);

    SongInfo {
        title,
        artist,
        is_playing,
        cover_art,
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
