import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import coverPlaceholder from "./assets/cover-placeholder.svg";
import WaveAnimation from "./WaveAnimation";
import { generateWaveConfig } from "./lib/wave";
import "./App.css";

const WAVE_BARS = 4;
const FADE_MS = 300;
// Safety net only: MPRIS/WinRT push updates instantly, but not every player
// implements the change signals reliably, so poll slowly in the background
// too, just so the widget can never go stale forever.
const FALLBACK_POLL_INTERVAL_MS = 10_000;
// If no "audio-levels" event arrives for this long, treat the system audio
// capture as unavailable/stalled and fall back to the decorative animation.
const AUDIO_LEVELS_TIMEOUT_MS = 1500;

interface SongInfo {
  title: string;
  artist: string;
  isPlaying: boolean;
  coverArt: string | null;
}

const EMPTY_SONG: SongInfo = {
  title: "",
  artist: "",
  isPlaying: false,
  coverArt: null,
};

function trackKey(song: SongInfo) {
  return `${song.title}|${song.artist}`;
}

function App() {
  const [displaySong, setDisplaySong] = useState<SongInfo>(EMPTY_SONG);
  const [fadeClass, setFadeClass] = useState<"fade-in" | "fade-out">(
    "fade-in",
  );
  const [waveConfig, setWaveConfig] = useState(() =>
    generateWaveConfig(WAVE_BARS),
  );
  const [audioLevels, setAudioLevels] = useState<number[] | null>(null);
  const lastLevelsAtRef = useRef(0);
  const trackKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const unlisten = listen<number[]>("audio-levels", (event) => {
      lastLevelsAtRef.current = Date.now();
      setAudioLevels(event.payload);
    });

    const watchdog = setInterval(() => {
      if (Date.now() - lastLevelsAtRef.current > AUDIO_LEVELS_TIMEOUT_MS) {
        setAudioLevels((current) => (current === null ? current : null));
      }
    }, 500);

    return () => {
      unlisten.then((fn) => fn());
      clearInterval(watchdog);
    };
  }, []);

  useEffect(() => {
    const applySong = (song: SongInfo) => {
      const key = trackKey(song);

      // Same track (or first paint): update in place, no fade needed.
      if (trackKeyRef.current === null || trackKeyRef.current === key) {
        trackKeyRef.current = key;
        setDisplaySong(song);
        return;
      }

      // Different track: fade out, swap content + wave pattern, fade in.
      trackKeyRef.current = key;
      setFadeClass("fade-out");
      setTimeout(() => {
        setDisplaySong(song);
        setWaveConfig(generateWaveConfig(WAVE_BARS));
        setFadeClass("fade-in");
      }, FADE_MS);
    };

    const fetchNow = () => {
      invoke<SongInfo>("check_music").then(applySong).catch(console.error);
    };

    // Real-time updates: the backend pushes this the instant MPRIS (Linux)
    // or WinRT (Windows) reports a change, instead of us polling on a timer.
    const unlisten = listen<SongInfo>("song-changed", (event) => {
      applySong(event.payload);
    });

    // First paint can't rely on an event that may fire before this listener
    // is even attached, so fetch the current state once immediately too.
    fetchNow();

    const fallback = setInterval(fetchNow, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      unlisten.then((fn) => fn());
      clearInterval(fallback);
    };
  }, []);

  const hasTrack = displaySong.title !== "";
  const title = hasTrack ? displaySong.title : "No track playing";
  const artist = hasTrack ? displaySong.artist : "—";
  const isPlaying = displaySong.isPlaying;

  return (
    <main className="card" data-tauri-drag-region>
      <div className="content" data-tauri-drag-region>
        <div className="icon-container" data-tauri-drag-region>
          <img
            src={displaySong.coverArt ?? coverPlaceholder}
            alt="Album cover"
            data-tauri-drag-region
          />
        </div>

        <div className={`text-info ${fadeClass}`} data-tauri-drag-region>
          <h1 data-tauri-drag-region>
            <span data-tauri-drag-region>{title}</span>
          </h1>
          <p data-tauri-drag-region>{artist}</p>
          <WaveAnimation
            bars={waveConfig}
            isPlaying={isPlaying}
            levels={audioLevels}
          />
        </div>

        <div className="controls">
          <button
            className="btn-secondary"
            aria-label="Previous"
            onClick={() => invoke("control_media", { action: "prev" })}
          >
            <SkipBack size={16} fill="currentColor" />
          </button>
          <button
            className="btn-primary"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => invoke("control_media", { action: "play_pause" })}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button
            className="btn-secondary"
            aria-label="Next"
            onClick={() => invoke("control_media", { action: "next" })}
          >
            <SkipForward size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </main>
  );
}

export default App;
