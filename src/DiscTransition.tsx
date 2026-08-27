export type DiscType = "vinyl" | "cd" | "cassette";

interface DiscTransitionProps {
  type: DiscType;
  /** Accent tint pulled from the album palette (see `resolvePaletteFor` in
   * App.tsx), so the loading disc visually matches the equalizer instead of
   * being a generic gray graphic. */
  accentColor: string;
}

function Reel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx},${cy})`}>
      <g>
        <circle r={6} fill="#3a3a40" />
        <rect x={-0.8} y={-6} width={1.6} height={12} fill="#1b1b1f" />
        <rect x={-6} y={-0.8} width={12} height={1.6} fill="#1b1b1f" />
        <circle r={1.6} fill="#0e0e10" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 0 0"
          to="360 0 0"
          dur="1.3s"
          repeatCount="indefinite"
        />
      </g>
    </g>
  );
}

function Vinyl({ accentColor }: { accentColor: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <g>
        <circle cx={50} cy={50} r={48} fill="#141414" />
        <circle cx={50} cy={50} r={48} fill="none" stroke="rgba(255,255,255,0.08)" />
        <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.07)" />
        <circle cx={50} cy={50} r={32} fill="none" stroke="rgba(255,255,255,0.07)" />
        <circle cx={50} cy={50} r={24} fill="none" stroke="rgba(255,255,255,0.06)" />
        <circle cx={50} cy={50} r={15} fill={accentColor} />
        <circle cx={50} cy={50} r={3} fill="#0b0b0b" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur="3s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}

// Modeled on the classic "music file" CD-with-a-note icon (docs/formats/cd_design.png):
// a glossy silver disc with an iridescent sheen swept across one side, a soft
// blue glow around the spindle hole, and a black eighth note laid across it.
// The note rotates together with the disc (one shared <g>) instead of sitting
// on top as a static badge, so it reads as part of the same spinning object.
function Cd({ accentColor }: { accentColor: string }) {
  const sheenId = "disc-cd-sheen";
  const hubId = "disc-cd-hub-glow";
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        {/* Swept from the lower-left (brightest, most saturated) toward the
            upper-right (fading back to plain silver) — a physical CD's
            diffraction sheen shows up as a bright arc on one side, not an
            even wash across the whole label. */}
        <linearGradient id={sheenId} x1="0.05" y1="0.95" x2="0.85" y2="0.1">
          <stop offset="0%" stopColor="#ffd54a" stopOpacity={0.85} />
          <stop offset="22%" stopColor="#ff7a5c" stopOpacity={0.6} />
          <stop offset="42%" stopColor={accentColor} stopOpacity={0.55} />
          <stop offset="62%" stopColor="#7cf0ff" stopOpacity={0.45} />
          <stop offset="85%" stopColor="#c9cdd3" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#c9cdd3" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={hubId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eef8ff" />
          <stop offset="45%" stopColor="#bfe6ff" />
          <stop offset="100%" stopColor="#bfe6ff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g>
        <circle cx={50} cy={50} r={48} fill="#d3d7dc" />
        <circle cx={50} cy={50} r={48} fill={`url(#${sheenId})`} />
        <circle cx={50} cy={50} r={48} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={0.5} />

        {/* Spindle hub: a soft blue glow with a couple of thin rings, instead
            of a flat gray ring, to match the reference's "glowing center". */}
        <circle cx={50} cy={50} r={22} fill={`url(#${hubId})`} />
        <circle cx={50} cy={50} r={16} fill="none" stroke="#8fd6ff" strokeWidth={1} opacity={0.6} />
        <circle cx={50} cy={50} r={10} fill="#eaf7ff" />
        <circle cx={50} cy={50} r={3} fill="#20232a" />

        {/* Eighth note, notehead near the lower-left rising to a flag at the
            upper-right — same diagonal placement as the reference icon. */}
        <g fill="#20232a">
          <ellipse cx={33} cy={70} rx={10} ry={7.5} transform="rotate(-24 33 70)" />
          <path d="M 41 66 L 58 20 L 62 20 L 45 66 Z" />
          <path d="M 58 20 C 72 22 76 34 64 41 C 69 31 65 23 58 20 Z" />
        </g>

        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}

function Cassette({ accentColor }: { accentColor: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx={50} cy={50} r={48} fill="#1b1b1f" stroke={accentColor} strokeWidth={3} />
      <rect x={25} y={36} width={50} height={28} rx={4} fill="#0e0e10" stroke="rgba(255,255,255,0.15)" />
      <rect x={30} y={41} width={40} height={8} fill="#2a2a2f" />
      <Reel cx={38} cy={58} />
      <Reel cx={62} cy={58} />
    </svg>
  );
}

/** Loading visual shown while the widget is mid-transition between tracks.
 * Purely presentational — the animations are SMIL (`animateTransform`) so
 * this component has no CSS dependency of its own and can be dropped
 * anywhere at any size. */
export default function DiscTransition({ type, accentColor }: DiscTransitionProps) {
  switch (type) {
    case "vinyl":
      return <Vinyl accentColor={accentColor} />;
    case "cd":
      return <Cd accentColor={accentColor} />;
    case "cassette":
      return <Cassette accentColor={accentColor} />;
  }
}
