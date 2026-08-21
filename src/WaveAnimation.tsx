import type { CSSProperties } from "react";
import type { WaveBar } from "./lib/wave";

interface WaveAnimationProps {
  bars: WaveBar[];
  isPlaying: boolean;
}

function WaveAnimation({ bars, isPlaying }: WaveAnimationProps) {
  return (
    <div
      className={`wave-container${isPlaying ? "" : " paused"}`}
      data-tauri-drag-region
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className="wave-bar"
          style={
            {
              animationDelay: `${bar.delay}s`,
              animationDuration: `${bar.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default WaveAnimation;
