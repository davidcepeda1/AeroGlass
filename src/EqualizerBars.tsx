import { type CSSProperties, useEffect, useRef, useState } from "react";

export type EqualizerStyle = "segmented" | "pill" | "neon" | "horn";

interface EqualizerBarsProps {
	/** One 0-1 level per bar — real audio energy, or a decorative fallback. */
	levels: number[];
	isPlaying: boolean;
	style: EqualizerStyle;
	/** Bottom-to-top gradient stops, themed off the album cover (or the
	 * default palette) — see `getEqualizerPalette` in `lib/albumColor`. */
	palette: string[];
	/** Peak-hold marker color — deliberately distinct from `palette`, see
	 * `getPeakColor` in `lib/albumColor`. Only used by the segmented style. */
	peakColor: string;
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

// Ballistics for the lit column itself (not just the peak dot). Without this
// the segment count snaps directly to whatever raw FFT-band value arrived
// that tick, which reads as flicker/noise rather than something following
// the music — real meters rise almost instantly on a transient but fall
// back gently, so the ear can connect "loud moment -> bar jumps up" even
// though the raw energy value is jittering every ~43ms underneath.
const LEVEL_ATTACK = 0.65;
const LEVEL_RELEASE = 0.22;

function hexToRgb(hex: string): [number, number, number] {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16),
	];
}

function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Samples a color at position `t` (0-1, bottom to top) along an ordered
 * list of hex stops, linearly blending between the two nearest ones. The
 * stops are already densely spaced and hue-consistent (see
 * `getEqualizerPalette`), so a plain RGB blend between neighbors is enough —
 * no need to redo the hue-aware interpolation at render time. */
function sampleGradient(stops: string[], t: number): string {
	const clamped = Math.min(1, Math.max(0, t));
	const scaled = clamped * (stops.length - 1);
	const i = Math.min(stops.length - 2, Math.floor(scaled));
	const frac = scaled - i;
	const [r1, g1, b1] = hexToRgb(stops[i]);
	const [r2, g2, b2] = hexToRgb(stops[i + 1]);
	return rgbToHex(
		r1 + (r2 - r1) * frac,
		g1 + (g2 - g1) * frac,
		b1 + (b2 - b1) * frac,
	);
}

function PillBars({
	levels,
	isPlaying,
	palette,
	neon,
}: Omit<EqualizerBarsProps, "style" | "peakColor"> & { neon?: boolean }) {
	const gradient = `linear-gradient(to top, ${palette.join(", ")})`;
	const [glowR, glowG, glowB] = hexToRgb(palette[palette.length - 1]);
	const glow = `rgba(${glowR}, ${glowG}, ${glowB}, ${neon ? 0.45 : 0.25})`;
	return (
		<div
			className={`eq eq-pill${neon ? " eq-neon" : ""}${isPlaying ? "" : " eq-paused"}`}
			style={
				{
					"--eq-gradient": gradient,
					"--eq-glow": glow,
					"--eq-edge": palette[palette.length - 1],
				} as CSSProperties
			}
		>
			{levels.map((level, barIndex) => {
				const lit = isPlaying ? Math.max(0.15, level) : 0;
				return (
					<div className="eq-pill-bar" key={barIndex}>
						<div
							className="eq-pill-mask"
							style={{ "--unlit": 1 - lit } as CSSProperties}
						/>
					</div>
				);
			})}
		</div>
	);
}

function SegmentedBars({
	levels,
	isPlaying,
	palette,
	peakColor,
}: Omit<EqualizerBarsProps, "style">) {
	const levelsRef = useRef(levels);
	levelsRef.current = levels;
	const fallSpeedRef = useRef<number[]>(levels.map(() => 0));
	const holdRef = useRef<number[]>(levels.map(() => 0));

	// Peak position in continuous "row units" (can go negative — it keeps
	// sliding below the visible column instead of stopping dead at row 0).
	const [peakRows, setPeakRows] = useState<number[]>(() => levels.map(() => 0));

	// The lit column's own level, eased toward the raw audio value (fast
	// attack, slower release) instead of snapping to it every tick — this is
	// what the peak dot already gets, applied to the bar itself so the count
	// of lit segments follows the music's envelope instead of raw FFT jitter.
	const [smoothedLevels, setSmoothedLevels] = useState<number[]>(() =>
		levels.map(() => 0),
	);

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

			setSmoothedLevels((prev) =>
				levelsRef.current.map((target, i) => {
					const current = prev[i] ?? 0;
					const rate = target >= current ? LEVEL_ATTACK : LEVEL_RELEASE;
					return current + (target - current) * rate;
				}),
			);
		}, PEAK_DECAY_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<div className={`eq${isPlaying ? "" : " eq-paused"}`}>
			{levels.map((_, barIndex) => {
				const lit = isPlaying
					? Math.round((smoothedLevels[barIndex] ?? 0) * SEGMENTS)
					: 0;
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
							style={
								{
									"--peak-row": peakRow,
									"--peak-color": peakColor,
								} as CSSProperties
							}
						/>
						{Array.from({ length: SEGMENTS }, (_, rowIndex) => (
							<span
								key={rowIndex}
								className={`eq-seg${rowIndex < lit ? " lit" : ""}`}
								style={
									{
										"--seg-color": sampleGradient(
											palette,
											rowIndex / (SEGMENTS - 1),
										),
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

// Nested wedge widths (outer/large -> inner/small, mouth to throat), one
// side of the horn silhouette from the reference logo. Mirrored for the
// right half. Static shape, not a per-band meter — it only reacts to
// isPlaying, same as the reference badge never animated per frequency.
const HORN_BANDS = [
	{ outerX: 2, innerX: 34, outerY: 2, innerY: 12 },
	{ outerX: 40, innerX: 58, outerY: 6, innerY: 14 },
	{ outerX: 62, innerX: 76, outerY: 10, innerY: 16 },
	{ outerX: 80, innerX: 90, outerY: 14, innerY: 18 },
];
const HORN_VIEW_WIDTH = 200;
const HORN_VIEW_HEIGHT = 48;

function wedgePoints(
	outerX: number,
	innerX: number,
	outerY: number,
	innerY: number,
) {
	const bottomOuterY = HORN_VIEW_HEIGHT - outerY;
	const bottomInnerY = HORN_VIEW_HEIGHT - innerY;
	return `${outerX},${outerY} ${innerX},${innerY} ${innerX},${bottomInnerY} ${outerX},${bottomOuterY}`;
}

function HornBars({
	isPlaying,
	palette,
	peakColor,
}: Omit<EqualizerBarsProps, "style" | "levels">) {
	return (
		<svg
			className={`eq-horn${isPlaying ? "" : " eq-paused"}`}
			viewBox={`0 0 ${HORN_VIEW_WIDTH} ${HORN_VIEW_HEIGHT}`}
			role="img"
			aria-label="Sound bar"
		>
			<defs>
				<pattern
					id="horn-dots"
					width="4"
					height="4"
					patternUnits="userSpaceOnUse"
				>
					<circle cx="1" cy="1" r="0.9" fill="rgba(0,0,0,0.45)" />
				</pattern>
			</defs>
			{HORN_BANDS.map((band, i) => {
				const color = sampleGradient(palette, i / (HORN_BANDS.length - 1));
				const leftPoints = wedgePoints(
					band.outerX,
					band.innerX,
					band.outerY,
					band.innerY,
				);
				const rightPoints = wedgePoints(
					HORN_VIEW_WIDTH - band.outerX,
					HORN_VIEW_WIDTH - band.innerX,
					band.outerY,
					band.innerY,
				);
				return (
					<g
						key={i}
						className="eq-horn-band"
						style={{ "--horn-color": color } as CSSProperties}
					>
						<polygon points={leftPoints} />
						<polygon points={leftPoints} fill="url(#horn-dots)" />
						<polygon points={rightPoints} />
						<polygon points={rightPoints} fill="url(#horn-dots)" />
					</g>
				);
			})}
			<rect
				className="eq-horn-peak"
				x={HORN_VIEW_WIDTH / 2 - 8}
				y={HORN_VIEW_HEIGHT / 2 - 5}
				width={16}
				height={10}
				rx={5}
				style={{ "--peak-color": peakColor } as CSSProperties}
			/>
		</svg>
	);
}

function EqualizerBars({
	levels,
	isPlaying,
	style,
	palette,
	peakColor,
}: EqualizerBarsProps) {
	if (style === "horn") {
		return (
			<HornBars isPlaying={isPlaying} palette={palette} peakColor={peakColor} />
		);
	}
	return style === "pill" || style === "neon" ? (
		<PillBars
			levels={levels}
			isPlaying={isPlaying}
			palette={palette}
			neon={style === "neon"}
		/>
	) : (
		<SegmentedBars
			levels={levels}
			isPlaying={isPlaying}
			palette={palette}
			peakColor={peakColor}
		/>
	);
}

export default EqualizerBars;
