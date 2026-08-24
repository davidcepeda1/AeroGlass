use super::{MediaAction, SessionSummary, SongInfo};
use base64::{engine::general_purpose::STANDARD, Engine};
use mpris::{Event, PlaybackStatus, Player, PlayerFinder};
use tauri::{AppHandle, Emitter};

fn active_player() -> Option<Player> {
    let finder = PlayerFinder::new().ok()?;

    // An explicit choice (multiple apps playing at once) wins, but only if
    // that player is still there — a session that quit falls back to the
    // usual "most likely" pick instead of the widget going blank.
    if let Some(id) = super::get_active_session() {
        if let Ok(players) = finder.find_all() {
            if let Some(player) = players.into_iter().find(|p| p.bus_name() == id) {
                return Some(player);
            }
        }
    }

    finder.find_active().or_else(|_| finder.find_first()).ok()
}

/// Every app currently exposing an MPRIS player, for the session picker —
/// independent of playback state, so a paused app still shows up as a
/// choice.
pub fn list_sessions() -> Vec<SessionSummary> {
    let Ok(finder) = PlayerFinder::new() else {
        return Vec::new();
    };
    let Ok(players) = finder.find_all() else {
        return Vec::new();
    };

    // Some players (VLC observed in practice) register a second, generic
    // bus name alongside their per-instance one — same process, same
    // `identity()`, which would otherwise show up as two indistinguishable
    // entries with the same label. Keep one bus name per identity,
    // preferring the `.instanceN` one since that stays tied to this exact
    // process even if a second window of the same app claims the generic
    // alias.
    let mut bus_name_by_identity: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for player in &players {
        let bus_name = player.bus_name().to_string();
        bus_name_by_identity
            .entry(player.identity().to_string())
            .and_modify(|existing| {
                if bus_name.contains(".instance") {
                    *existing = bus_name.clone();
                }
            })
            .or_insert(bus_name);
    }

    let mut sessions: Vec<SessionSummary> = bus_name_by_identity
        .into_iter()
        .map(|(name, id)| SessionSummary { id, name })
        .collect();
    // Stable order: HashMap iteration order isn't guaranteed consistent
    // across calls, which would otherwise make the list look like it
    // reshuffles on every poll tick and make change-detection (comparing
    // this list between polls) unreliable.
    sessions.sort_by(|a, b| a.id.cmp(&b.id));
    sessions
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

/// Pushes a `song-changed` event with the fresh `SongInfo` every time MPRIS
/// reports something relevant, instead of making the frontend poll on a
/// timer. Runs for the lifetime of the app, reconnecting if the player
/// disappears (quits, or never started) so a player opened later is picked
/// up without restarting the widget.
pub fn watch_song_changes(app: AppHandle) {
    std::thread::spawn(move || loop {
        if let Err(err) = watch_once(&app) {
            eprintln!("aeroglass: MPRIS event stream ended ({err}), retrying");
        }
        std::thread::sleep(std::time::Duration::from_secs(2));
    });
}

/// Called right after the active session changes (picked from the tray, or
/// reverted to auto). `watch_once` blocks on *one* player's D-Bus event
/// stream, so the long-lived loop above keeps listening to whichever player
/// it originally attached to — without this, switching sessions wouldn't
/// look instant: the widget would sit on stale data until the old player's
/// stream happens to end, or the frontend's 10s fallback poll catches up.
/// Firing a fresh one-shot `watch_once` immediately pushes the new
/// selection's state and starts following *its* live events from now on.
pub fn reconnect_active_session(app: AppHandle) {
    std::thread::spawn(move || {
        let _ = watch_once(&app);
    });
}

fn watch_once(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let player = active_player().ok_or("no active MPRIS player")?;
    let events = player.events()?;

    // Push current state immediately so the frontend doesn't sit on stale
    // data until the next actual change.
    let _ = app.emit("song-changed", get_song_info());

    for event in events {
        let event = event?;

        let relevant = matches!(
            event,
            Event::TrackChanged(_)
                | Event::Playing
                | Event::Paused
                | Event::Stopped
                | Event::PlayerShutDown
        );
        if relevant {
            let _ = app.emit("song-changed", get_song_info());
        }
        if matches!(event, Event::PlayerShutDown) {
            break;
        }
    }

    Ok(())
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
