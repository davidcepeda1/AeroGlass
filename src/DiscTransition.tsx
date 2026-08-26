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

function Cd({ accentColor }: { accentColor: string }) {
  const gradientId = "disc-cd-sheen";
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity={0.75} />
          <stop offset="30%" stopColor="#7cffe0" stopOpacity={0.35} />
          <stop offset="55%" stopColor="#ffe97c" stopOpacity={0.3} />
          <stop offset="80%" stopColor="#ff7ce0" stopOpacity={0.35} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <g>
        <circle cx={50} cy={50} r={48} fill="#c9cdd3" />
        <circle cx={50} cy={50} r={48} fill={`url(#${gradientId})`} />
        <circle cx={50} cy={50} r={48} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.5} />
        <circle cx={50} cy={50} r={9} fill="#e8eaee" />
        <circle cx={50} cy={50} r={3} fill="#141414" />
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
