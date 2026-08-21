import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import coverPlaceholder from "./assets/cover-placeholder.svg";
import WaveAnimation from "./WaveAnimation";
import { generateWaveConfig } from "./lib/wave";
import "./App.css";

const WAVE_BARS = 4;
const POLL_INTERVAL_MS = 1000;
const FADE_MS = 300;

interface SongInfo {
  title: string;
  artist: string;
  isPlaying: boolean;
}

const EMPTY_SONG: SongInfo = { title: "", artist: "", isPlaying: false };

function trackKey(song: SongInfo) {
  return `${song.title}|${song.artist}`;
}

function App() {
  const [displaySong, setDisplaySong] = useState<SongInfo>(EMPTY_SONG);
  const [isFading, setIsFading] = useState(false);
  const [waveConfig, setWaveConfig] = useState(() =>
    generateWaveConfig(WAVE_BARS),
  );
  const trackKeyRef = useRef<string | null>(null);

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
      setIsFading(true);
      setTimeout(() => {
        setDisplaySong(song);
        setWaveConfig(generateWaveConfig(WAVE_BARS));
        setIsFading(false);
      }, FADE_MS);
    };

    const poll = () => {
      invoke<SongInfo>("check_music").then(applySong).catch(console.error);
    };
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const hasTrack = displaySong.title !== "";
  const title = hasTrack ? displaySong.title : "No track playing";
  const artist = hasTrack ? displaySong.artist : "—";
  const isPlaying = displaySong.isPlaying;

  return (
    <main className="card">
      <div className="content">
        <img src={coverPlaceholder} alt="Album cover" className="cover" />
        <div className={`info${isFading ? " fading" : ""}`}>
          <p className="title">{title}</p>
          <p className="artist">{artist}</p>
        </div>
        <WaveAnimation bars={waveConfig} isPlaying={isPlaying} />
      </div>

      <div className="controls">
        <button
          className="control control-secondary"
          aria-label="Previous"
          onClick={() => invoke("control_media", { action: "prev" })}
        >
          <SkipBack size={16} fill="currentColor" />
        </button>
        <button
          className="control control-primary"
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
          className="control control-secondary"
          aria-label="Next"
          onClick={() => invoke("control_media", { action: "next" })}
        >
          <SkipForward size={16} fill="currentColor" />
        </button>
      </div>
    </main>
  );
}

export default App;
