import type { CSSProperties } from "react";
import type { WaveBar } from "./lib/wave";

interface WaveAnimationProps {
  bars: WaveBar[];
  isPlaying: boolean;
  /** Real per-band levels (0-1) from the system audio capture, one per bar.
   *  `null` means the capture isn't available/running — falls back to the
   *  decorative randomized animation instead. */
  levels: number[] | null;
}

function WaveAnimation({ bars, isPlaying, levels }: WaveAnimationProps) {
  const isLive = levels !== null && levels.length === bars.length;

  return (
    <div
      className={`wave-container${isPlaying ? "" : " paused"}${isLive ? " live" : ""}`}
      data-tauri-drag-region
    >
      {bars.map((bar, i) => {
        if (isLive) {
          const level = levels![i];
          const scale = 0.5 + level * 1.1;
          return (
            <span
              key={i}
              className="wave-bar"
              style={
                {
                  transform: `scaleY(${scale})`,
                  opacity: 0.55 + level * 0.45,
                  boxShadow: `0 0 ${2 + level * 6}px rgba(120, 190, 255, ${0.4 + level * 0.5}), 0 0 ${4 + level * 10}px rgba(150, 120, 255, ${0.25 + level * 0.4})`,
                } as CSSProperties
              }
            />
          );
        }

        return (
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
        );
      })}
    </div>
  );
}

export default WaveAnimation;
