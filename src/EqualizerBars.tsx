import { useEffect, useRef, useState, type CSSProperties } from "react";

interface EqualizerBarsProps {
  /** One 0-1 level per bar — real audio energy, or a decorative fallback. */
  levels: number[];
  isPlaying: boolean;
}

const SEGMENTS = 6;
const PEAK_DECAY_INTERVAL_MS = 45;
// Real peak-hold meters freeze briefly at the new peak before falling —
// without this the fall starts instantly and reads as "always sinking"
// rather than a distinct hold-then-drop.
const PEAK_HOLD_TICKS = 4; // ~180ms
// Fall speed in row-units per tick, fast enough to be visible from the very
// first tick (not a slow ramp-up that looks frozen for the first stretch),
// then accelerates further so the whole column empties in about a second.
const PEAK_FALL_BASE_ROWS = 0.16;
const PEAK_FALL_ACCEL_ROWS = 0.05;
const PEAK_FALL_MAX_ROWS = 0.7;
// Once it falls past the bottom row, keep it drifting a little further
// before letting the next rise catch it — the marker is always sliding,
// never frozen or hidden, it just goes far enough to clip out of view.
const PEAK_FLOOR_ROWS = -2;

/** Bottom-to-top color ramp, matching a classic graphic-EQ: blue -> cyan -> green. */
function segmentColor(rowFromBottom: number, totalRows: number): string {
  const t = rowFromBottom / (totalRows - 1);
  if (t < 0.45) return "#2f6bff";
  if (t < 0.75) return "#22c7c0";
  return "#3ee85a";
}

function EqualizerBars({ levels, isPlaying }: EqualizerBarsProps) {
  const levelsRef = useRef(levels);
  levelsRef.current = levels;
  const fallSpeedRef = useRef<number[]>(levels.map(() => 0));
  const holdRef = useRef<number[]>(levels.map(() => 0));

  // Peak position in continuous "row units" (can go negative — it keeps
  // sliding below the visible column instead of stopping dead at row 0).
  const [peakRows, setPeakRows] = useState<number[]>(() => levels.map(() => 0));

  // Single authoritative tick: instant rise -> brief hold -> accelerating
  // fall, all driven from one interval reading the *current* level. Doing
  // this in one place (instead of a separate "bump up on every
  // audio-levels event" effect racing a fall interval) is what actually
  // lets the peak move — audio-levels arrives far faster than any fall
  // tick, so a bump-on-every-update effect always re-wins and never falls.
  useEffect(() => {
    const id = setInterval(() => {
      setPeakRows((prev) =>
        levelsRef.current.map((lvl, i) => {
          const lvlRow = lvl * (SEGMENTS - 1);
          const prevRow = prev[i] ?? 0;

          if (lvlRow >= prevRow) {
            fallSpeedRef.current[i] = 0;
            holdRef.current[i] = PEAK_HOLD_TICKS;
            return lvlRow;
          }

          if ((holdRef.current[i] ?? 0) > 0) {
            holdRef.current[i] -= 1;
            return prevRow;
          }

          fallSpeedRef.current[i] = Math.min(
            PEAK_FALL_MAX_ROWS,
            (fallSpeedRef.current[i] ?? 0) + PEAK_FALL_ACCEL_ROWS,
          );
          const fallen =
            prevRow - (PEAK_FALL_BASE_ROWS + fallSpeedRef.current[i]);
          return Math.max(lvlRow, fallen, PEAK_FLOOR_ROWS);
        }),
      );
    }, PEAK_DECAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`eq${isPlaying ? "" : " eq-paused"}`}>
      {levels.map((level, barIndex) => {
        const lit = isPlaying ? Math.round(level * SEGMENTS) : 0;
        // Clamp only the top: never render above the bar's own column. No
        // bottom clamp — it's allowed to slide below row 0 and clip out of
        // view (see .eq-bar { overflow: hidden }) instead of parking there.
        const peakRow = isPlaying
          ? Math.min(SEGMENTS - 1, peakRows[barIndex] ?? 0)
          : PEAK_FLOOR_ROWS;

        return (
          <div className="eq-bar" key={barIndex}>
            <div
              className="eq-peak"
              style={{ "--peak-row": peakRow } as CSSProperties}
            />
            {Array.from({ length: SEGMENTS }, (_, rowIndex) => (
              <span
                key={rowIndex}
                className={`eq-seg${rowIndex < lit ? " lit" : ""}`}
                style={
                  {
                    "--seg-color": segmentColor(rowIndex, SEGMENTS),
                  } as CSSProperties
                }
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default EqualizerBars;
