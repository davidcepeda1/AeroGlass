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

// Modeled precisely on the classic "music file" CD-with-a-note icon
// (docs/formats/cd_design.png) — built and tuned as a standalone HTML/CSS
// prototype first (matched side-by-side against the reference, including a
// real headless-browser render for comparison), then ported in here as-is.
// Uses CSS (conic-gradient, mask-image) rather than pure SVG because SVG has
// no native conic-gradient — that's what gives the rainbow sheen its banding
// and what punches the spindle hub into a genuinely see-through cutout
// (tinted "glass" rings over whatever sits behind the disc) instead of a
// solid painted circle.
//
// The note is deliberately its own non-rotating layer: unlike Vinyl/Cassette
// where the whole graphic spins as one group, the note here sits fixed in
// the disc's lower-left (docs/formats/idea1.png marks the spot) and just
// pulses gently — only the disc + hub actually rotate underneath it.
function Cd() {
  return (
    <div className="disc-cd2-wrap">
      <style>{`
        .disc-cd2-wrap { position: relative; width: 100%; height: 100%; }
        .disc-cd2-spin { position: absolute; inset: 0; animation: disc-cd2-spin 2.4s linear infinite; }
        @keyframes disc-cd2-spin { to { transform: rotate(360deg); } }
        .disc-cd2-disc {
          position: absolute;
          /* Slightly larger than the rainbow/glare/vignette layers (which
             stay at inset:0) on purpose: this WebKitGTK build renders those
             gradients a few px past their own border-radius clip (confirmed
             with diagnostic outlines — all layers share the exact same box,
             yet the conic-gradient still paints outside it). Rather than
             fight the renderer, the base disc is made just big enough that
             whatever bleeds past the other layers still lands on more of
             the same metal/rim, instead of on the transparent gap beyond. */
          inset: -6px;
          border-radius: 50%;
          /* Hot highlight through to a dark gunmetal edge — higher contrast
             than an even, softly-lit gradient reads as brushed metal instead
             of pastel plastic. */
          background: radial-gradient(
            circle at 38% 32%,
            #ffffff 0%,
            #eef0f3 14%,
            #c3c8d0 38%,
            #9298a2 58%,
            #6b7078 78%,
            #4b4f56 100%
          );
          box-shadow:
            inset 0 0 0 5px #10233a,
            inset 0 0 0 6.5px rgba(255, 255, 255, 0.6),
            inset 0 0 16px rgba(0, 0, 0, 0.35);
          /* The whole hub assembly (not just a pinhole) is cut through the
             disc — the reference's "rings" are tinted glass over the real
             background, not opaque paint on solid silver: zooming the
             reference shows its sky/cloud texture through every ring,
             progressively clearer toward the center. */
          -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 0 21%, black 23% 100%);
          mask-image: radial-gradient(circle at 50% 50%, transparent 0 21%, black 23% 100%);
          /* Forces its own GPU compositing layer — same fix as .icon-container
             in App.css. Without this, WebKitGTK can rasterize a masked/
             blended child's clip through a coarser pass than its own
             border-radius, letting the rainbow band in ::before bleed past
             the circle into the square corners around it. */
          transform: translateZ(0);
          isolation: isolate;
        }
        /* .disc-cd2-rainbow and .disc-cd2-glare used to be .disc-cd2-disc's
           ::before/::after. In this WebKitGTK build, pseudo-elements with a
           gradient background don't reliably clip to their own
           border-radius — real sibling elements do (confirmed: this same
           bug hit .disc-cd2-vignette too on this same disc before it was
           converted, plus the vinyl surface here confirmed clean at the
           equivalent test) — so both are real elements now, not ::before/
           ::after, purely to get a clip WebKitGTK actually honors. */
        .disc-cd2-rainbow {
          /* Full-radius iridescent wash — deliberately not masked to a ring
             here; the ring shape is carved afterward by .disc-cd2-vignette
             painting plain metal back over it instead. */
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 100deg,
            #ff9a33 120deg,
            #ff4d3d 136deg,
            #ffae33 158deg,
            transparent 180deg,
            transparent 280deg,
            #7ee055 300deg,
            #c8f23d 314deg,
            #4ddba0 332deg,
            transparent 355deg
          );
          mix-blend-mode: hard-light;
          opacity: 0.95;
        }
        .disc-cd2-vignette {
          /* Paints plain metal back over the rainbow near the hub and near
             the rim, carving it down to a mid-radius band without relying
             on mask-image + blend-mode together. Approximates the base
             disc's own tones at each radius so it reads as "more of the
             same metal", not a visible patch. Also backstops .disc-cd2-glare
             below by dimming it again near the rim. */
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            transparent 0%,
            transparent 23%,
            #dce0e6 27%,
            transparent 35%,
            transparent 78%,
            #7a7f88 87%,
            #565a61 100%
          );
        }
        .disc-cd2-glare {
          /* tight, hot specular glare — a hard highlight reads as polished
             metal, a soft wide one reads as matte plastic */
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at 74% 24%, rgba(255, 255, 255, 0.98), transparent 16%),
            radial-gradient(circle at 74% 24%, rgba(255, 255, 255, 0.5), transparent 30%);
        }
        .disc-cd2-brushed {
          /* fine concentric brush-mark rings, like a spun-metal surface */
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            rgba(255, 255, 255, 0.16) 0px,
            rgba(255, 255, 255, 0.16) 1px,
            rgba(20, 22, 26, 0.1) 1px,
            rgba(20, 22, 26, 0.1) 2.4px
          );
          mix-blend-mode: overlay;
          opacity: 0.55;
          transform: translateZ(0);
          isolation: isolate;
        }
        .disc-cd2-hub-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        /* Concentric tinted-glass rings — translucent fills, not borders on
           an opaque shape, so they genuinely lighten toward the center:
           outermost/grayest to innermost/clearest. */
        .disc-cd2-hub-ring.g1 { width: 42%; height: 42%; background: rgba(196, 205, 218, 0.4); }
        .disc-cd2-hub-ring.g2 { width: 32%; height: 32%; background: rgba(110, 170, 215, 0.45); }
        .disc-cd2-hub-ring.g3 { width: 26%; height: 26%; background: rgba(225, 238, 250, 0.5); }
        .disc-cd2-hub-ring.g4 { width: 20%; height: 20%; background: rgba(80, 160, 220, 0.55); }
        .disc-cd2-hub-ring.g5 { width: 10%; height: 10%; background: rgba(255, 255, 255, 0.18); }
        .disc-cd2-note {
          position: absolute;
          inset: 0;
          overflow: visible;
          transform-origin: 22% 63%;
          animation: disc-cd2-pulse 1.8s ease-in-out infinite;
        }
        @keyframes disc-cd2-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.92; }
        }
        @media (prefers-reduced-motion: reduce) {
          .disc-cd2-spin, .disc-cd2-note { animation: none; }
        }
      `}</style>
      <div className="disc-cd2-spin">
        <div className="disc-cd2-disc" />
        <div className="disc-cd2-rainbow" />
        <div className="disc-cd2-glare" />
        <div className="disc-cd2-vignette" />
        <div className="disc-cd2-brushed" />
        <div className="disc-cd2-hub-ring g1" />
        <div className="disc-cd2-hub-ring g2" />
        <div className="disc-cd2-hub-ring g3" />
        <div className="disc-cd2-hub-ring g4" />
        <div className="disc-cd2-hub-ring g5" />
      </div>
      <svg className="disc-cd2-note" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="disc-cd2-note-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a4a4e" />
            <stop offset="42%" stopColor="#141417" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <filter id="disc-cd2-note-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={4.5} />
          </filter>
        </defs>
        {/* Notehead + stem drawn as two overlapping shapes deliberately
            overlapped deep into each other (not just touching at the edge)
            so the union reads as one seamless silhouette instead of leaving
            a notch where a straight edge met the ellipse boundary. */}
        <g transform="translate(-6,86) scale(0.42)">
          <g transform="translate(5,7)" opacity={0.35} filter="url(#disc-cd2-note-shadow)">
            <ellipse cx={52} cy={148} rx={23} ry={17} transform="rotate(-25 52 148)" fill="#021428" />
            <path d="M55,144 L120,38 L132,41 L65,148 Z" fill="#021428" />
            <path d="M120,38 C142,41 158,56 152,74 C147,90 126,92 118,76 C128,68 134,52 120,38 Z" fill="#021428" />
          </g>
          <g>
            <ellipse cx={52} cy={148} rx={23} ry={17} transform="rotate(-25 52 148)" fill="url(#disc-cd2-note-body)" />
            <path d="M55,144 L120,38 L132,41 L65,148 Z" fill="url(#disc-cd2-note-body)" />
            <path
              d="M120,38 C142,41 158,56 152,74 C147,90 126,92 118,76 C128,68 134,52 120,38 Z"
              fill="url(#disc-cd2-note-body)"
            />
          </g>
          <g opacity={0.85}>
            <path d="M74,129 L124,42" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.75} />
            <ellipse cx={44} cy={139} rx={9} ry={4.5} transform="rotate(-25 44 139)" fill="#ffffff" opacity={0.55} />
          </g>
        </g>
      </svg>
    </div>
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
 * Purely presentational and self-contained — Vinyl/Cassette animate via
 * SMIL (`animateTransform`), Cd via an inline `<style>` tag it carries with
 * it — either way there's no external CSS dependency, so this can be
 * dropped anywhere at any size. */
export default function DiscTransition({ type, accentColor }: DiscTransitionProps) {
  switch (type) {
    case "vinyl":
      return <Vinyl accentColor={accentColor} />;
    case "cd":
      return <Cd />;
    case "cassette":
      return <Cassette accentColor={accentColor} />;
  }
}
