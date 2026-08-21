import type { CSSProperties } from "react";
import type { WaveBar } from "./lib/wave";
import "./WaveAnimation.css";

interface WaveAnimationProps {
  bars: WaveBar[];
  isPlaying: boolean;
}

function WaveAnimation({ bars, isPlaying }: WaveAnimationProps) {
  return (
    <div className={`wave${isPlaying ? "" : " paused"}`}>
      {bars.map((bar, i) => (
        <span
          key={i}
          className="wave-bar"
          style={
            {
              "--peak": `${bar.peak}%`,
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
