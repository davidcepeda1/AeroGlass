import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import coverPlaceholder from "./assets/cover-placeholder.svg";
import WaveAnimation from "./WaveAnimation";
import { generateWaveConfig } from "./lib/wave";
import "./App.css";

const WAVE_BARS = 4;

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const title = "No track playing";
  const artist = "—";

  const [waveConfig, setWaveConfig] = useState(() =>
    generateWaveConfig(WAVE_BARS),
  );

  useEffect(() => {
    setWaveConfig(generateWaveConfig(WAVE_BARS));
  }, [title]);

  return (
    <main className="card">
      <div className="content">
        <img src={coverPlaceholder} alt="Album cover" className="cover" />
        <div className="info">
          <p className="title">{title}</p>
          <p className="artist">{artist}</p>
        </div>
        <WaveAnimation bars={waveConfig} isPlaying={isPlaying} />
      </div>

      <div className="controls">
        <button className="control control-secondary" aria-label="Previous">
          <SkipBack size={16} fill="currentColor" />
        </button>
        <button
          className="control control-primary"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => setIsPlaying((playing) => !playing)}
        >
          {isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
        <button className="control control-secondary" aria-label="Next">
          <SkipForward size={16} fill="currentColor" />
        </button>
      </div>
    </main>
  );
}

export default App;
