import { useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import coverPlaceholder from "./assets/cover-placeholder.svg";
import "./App.css";

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <main className="card">
      <div className="content">
        <img src={coverPlaceholder} alt="Album cover" className="cover" />
        <div className="info">
          <p className="title">No track playing</p>
          <p className="artist">—</p>
        </div>
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
