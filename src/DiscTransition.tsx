export type DiscType = "vinyl" | "cd" | "cassette1" | "cassette2";

interface DiscTransitionProps {
	type: DiscType;
	/** Accent tint pulled from the album palette (see `resolvePaletteFor` in
	 * App.tsx), so the loading disc visually matches the equalizer instead of
	 * being a generic gray graphic. */
	accentColor: string;
}

/** A cassette's spool reel: a white/cream hub with a dark 8-point gear cross,
 * the only part of either cassette design that actually spins — the body
 * stays put, same as a real tape deck. */
function GearReel({
	cx,
	cy,
	r,
	hub,
	spoke,
}: {
	cx: number;
	cy: number;
	r: number;
	hub: string;
	spoke: string;
}) {
	return (
		<g transform={`translate(${cx},${cy})`}>
			<g>
				<circle r={r} fill={hub} />
				<circle
					r={r}
					fill="none"
					stroke={spoke}
					strokeWidth={1}
					opacity={0.5}
				/>
				<g stroke={spoke} strokeWidth={r * 0.19}>
					<line x1={0} y1={-r * 0.7} x2={0} y2={r * 0.7} />
					<line x1={-r * 0.7} y1={0} x2={r * 0.7} y2={0} />
					<line x1={-r * 0.5} y1={-r * 0.5} x2={r * 0.5} y2={r * 0.5} />
					<line x1={-r * 0.5} y1={r * 0.5} x2={r * 0.5} y2={-r * 0.5} />
				</g>
				<circle r={r * 0.22} fill={spoke} />
				<animateTransform
					attributeName="transform"
					type="rotate"
					from="0"
					to="360"
					dur="1.6s"
					repeatCount="indefinite"
				/>
			</g>
		</g>
	);
}

// HTML/CSS layers (same approach as Cd below) rather than pure SVG, so the
// groove texture and the specular sheen can use repeating-/conic-gradient —
// CSS-only features SVG can't paint natively. Everything but the sheen and
// grooves stays inside the spinning layer, same as Cd's disc+hub group; the
// sheen is what actually reads as "spinning" instead of a still photo — two
// soft specular streaks fixed to the vinyl's surface that sweep past a
// viewer's eye once per rotation, the way real light catches the grooves.
function Vinyl({ accentColor }: { accentColor: string }) {
	return (
		<div className="disc-vinyl-wrap">
			<style>{`
        .disc-vinyl-wrap { position: relative; width: 100%; height: 100%; }
        .disc-vinyl-spin { position: absolute; inset: 0; animation: disc-vinyl-spin 2.8s linear infinite; }
        @keyframes disc-vinyl-spin { to { transform: rotate(360deg); } }
        .disc-vinyl-disc {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 36%, #333338 0%, #1c1c20 28%, #0a0a0c 60%, #000000 100%);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.07),
            inset 0 3px 8px rgba(255, 255, 255, 0.06),
            inset 0 -4px 12px rgba(0, 0, 0, 0.65);
        }
        /* Fine concentric groove rings — a repeating ring pattern reads as
           the record's actual grooves instead of a flat painted disc. */
        .disc-vinyl-grooves {
          position: absolute;
          inset: 7%;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            rgba(255, 255, 255, 0.07) 0px,
            rgba(255, 255, 255, 0.07) 0.6px,
            transparent 0.6px,
            transparent 3px
          );
          mix-blend-mode: screen;
          opacity: 0.55;
        }
        /* The spinning specular sheen — the visual cue that this is turning,
           not a static icon. */
        .disc-vinyl-sheen {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 18deg,
            rgba(255, 255, 255, 0.55) 34deg,
            transparent 52deg,
            transparent 185deg,
            rgba(255, 255, 255, 0.28) 202deg,
            transparent 222deg,
            transparent 360deg
          );
          mix-blend-mode: screen;
        }
        .disc-vinyl-label {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 42%;
          height: 42%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: ${accentColor};
          box-shadow:
            inset 0 0 0 1px rgba(0, 0, 0, 0.35),
            inset -3px -3px 7px rgba(0, 0, 0, 0.4),
            inset 3px 3px 7px rgba(255, 255, 255, 0.4),
            0 1px 3px rgba(0, 0, 0, 0.5);
        }
        /* Faint printed rings on the paper label, same groove-ring motif at
           a much finer, lower-contrast scale. */
        .disc-vinyl-label::before {
          content: "";
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            rgba(0, 0, 0, 0.1) 0px,
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 16%
          );
        }
        .disc-vinyl-spindle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6%;
          height: 6%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: #050505;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }
        @media (prefers-reduced-motion: reduce) {
          .disc-vinyl-spin { animation: none; }
        }
      `}</style>
			<div className="disc-vinyl-spin">
				<div className="disc-vinyl-disc" />
				<div className="disc-vinyl-grooves" />
				<div className="disc-vinyl-sheen" />
				<div className="disc-vinyl-label" />
				<div className="disc-vinyl-spindle" />
			</div>
		</div>
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
					<filter
						id="disc-cd2-note-shadow"
						x="-60%"
						y="-60%"
						width="220%"
						height="220%"
					>
						<feGaussianBlur stdDeviation={4.5} />
					</filter>
				</defs>
				{/* Notehead + stem drawn as two overlapping shapes deliberately
            overlapped deep into each other (not just touching at the edge)
            so the union reads as one seamless silhouette instead of leaving
            a notch where a straight edge met the ellipse boundary. */}
				<g transform="translate(-6,86) scale(0.42)">
					<g
						transform="translate(5,7)"
						opacity={0.35}
						filter="url(#disc-cd2-note-shadow)"
					>
						<ellipse
							cx={52}
							cy={148}
							rx={23}
							ry={17}
							transform="rotate(-25 52 148)"
							fill="#021428"
						/>
						<path d="M55,144 L120,38 L132,41 L65,148 Z" fill="#021428" />
						<path
							d="M120,38 C142,41 158,56 152,74 C147,90 126,92 118,76 C128,68 134,52 120,38 Z"
							fill="#021428"
						/>
					</g>
					<g>
						<ellipse
							cx={52}
							cy={148}
							rx={23}
							ry={17}
							transform="rotate(-25 52 148)"
							fill="url(#disc-cd2-note-body)"
						/>
						<path
							d="M55,144 L120,38 L132,41 L65,148 Z"
							fill="url(#disc-cd2-note-body)"
						/>
						<path
							d="M120,38 C142,41 158,56 152,74 C147,90 126,92 118,76 C128,68 134,52 120,38 Z"
							fill="url(#disc-cd2-note-body)"
						/>
					</g>
					<g opacity={0.85}>
						<path
							d="M74,129 L124,42"
							stroke="#ffffff"
							strokeWidth={3.5}
							strokeLinecap="round"
							fill="none"
							opacity={0.75}
						/>
						<ellipse
							cx={44}
							cy={139}
							rx={9}
							ry={4.5}
							transform="rotate(-25 44 139)"
							fill="#ffffff"
							opacity={0.55}
						/>
					</g>
				</g>
			</svg>
		</div>
	);
}

// Modeled on docs/formats/cassette_design_1.png. The first pass read too
// close to a floppy disk because it merged the reference's two separate
// zones — a small cream *label* strip up top, and a dark reel *window*
// below it with only a sliver of orange peeking around its edges — into one
// big pale rectangle spanning both. A cassette's defining feature is that
// dark window with visible spools; a large pale panel is what reads as a
// floppy's label/shutter instead. Static body (real cassettes don't spin as
// a whole) — only the two reels turn.
function CassetteRetro() {
	return (
		<svg viewBox="0 0 100 100" width="100%" height="100%">
			<rect
				x={11}
				y={14}
				width={78}
				height={72}
				rx={9}
				fill="#1c1c22"
				stroke="#0a0a0d"
				strokeWidth={1}
			/>
			{/* Side-locking nubs, borrowed from CassetteColor's reference (this
          design's own source art doesn't show them, but they read as the
          same structural detail) — positioned low, level with the bottom
          trapezoid panel, same as there. */}
			<rect
				x={6}
				y={62}
				width={7}
				height={13}
				rx={2}
				fill="#1c1c22"
				stroke="#0a0a0d"
				strokeWidth={1}
			/>
			<rect
				x={87}
				y={62}
				width={7}
				height={13}
				rx={2}
				fill="#1c1c22"
				stroke="#0a0a0d"
				strokeWidth={1}
			/>
			{/* One single rounded frame running cream / orange / cream again — not
          three separately-bordered pieces stacked with gaps. The reference
          traces one continuous outline the whole way down to the "90 min"
          row; only the fill color changes along it, via a clip instead of
          separate shapes. */}
			<defs>
				<clipPath id="disc-cassette1-frame-clip">
					<rect x={17} y={19} width={66} height={46} rx={3} />
				</clipPath>
			</defs>
			<g clipPath="url(#disc-cassette1-frame-clip)">
				<rect x={17} y={19} width={66} height={11} fill="#f1e7d8" />
				<rect x={17} y={30} width={66} height={28} fill="#e2542e" />
				<rect x={17} y={58} width={66} height={7} fill="#f1e7d8" />
			</g>
			<rect x={18} y={21} width={11} height={8} rx={1.5} fill="#e2542e" />
			<line
				x1={36}
				y1={23.5}
				x2={68}
				y2={23.5}
				stroke="#c9bfae"
				strokeWidth={0.6}
			/>
			<line
				x1={36}
				y1={26.5}
				x2={68}
				y2={26.5}
				stroke="#c9bfae"
				strokeWidth={0.6}
			/>
			{/* Reel window: a smaller dark rect inset within the frame's orange
          band, not a separate bordered panel of its own — narrowed to match
          CassetteColor's proportions so orange shows as a margin on the
          sides too, not just top/bottom. */}
			<rect x={21} y={33} width={58} height={24} rx={1} fill="#111114" />
			{/* Fan of curved light catches between the reels — the reference
          shows nested arcs (like a shutter or the tape itself catching
          light), not straight diagonal lines. */}
			<g fill="none" strokeLinecap="round">
				<path
					d="M44,38 Q41,45.5 44,53"
					stroke="#e8e6e2"
					strokeWidth={1.4}
					opacity={0.85}
				/>
				<path
					d="M47,38 Q44.5,45.5 47,53"
					stroke="#c7c5c2"
					strokeWidth={1.2}
					opacity={0.65}
				/>
				<path
					d="M50,38 Q48,45.5 50,53"
					stroke="#9a9894"
					strokeWidth={1.1}
					opacity={0.5}
				/>
				<path
					d="M53,38 Q51.3,45.5 53,53"
					stroke="#706e6c"
					strokeWidth={1}
					opacity={0.4}
				/>
				<path
					d="M56,38 Q54.7,45.5 56,53"
					stroke="#4c4a49"
					strokeWidth={0.9}
					opacity={0.3}
				/>
			</g>
			{/* Duration pill: sits inside the frame's bottom cream band (not
          floating below it), shorter and right-aligned like the
          reference's "90 min" label + accent bar. */}
			<rect x={45} y={59} width={35} height={5} rx={2} fill="#e2542e" />
			{/* Bottom trapezoid panel — measured off the reference (docs/formats/
          cassette_design_1.png) with a grid overlay: it's narrow at the top
          and opens wider toward the body's bottom edge, like half of a long,
          wide hexagon — not the reverse (wide-top-narrowing-down reads as a
          triangle closing to a point, which isn't what the art shows).
          Outlined in the same orange accent — with its 5 rivets arced
          (center-high), plus two more rivets outside it at the body's own
          bottom corners. */}
			{/* Fill and outline are two separate paths on purpose: the reference's
          accent border only runs along the top edge and the two diagonal
          sides — the bottom edge is left unstroked, blending straight into
          the body's own border instead of double-lining it. */}
			<path d="M32,69 L69,69 L81,85 L20,85 Z" fill="#18181d" />
			<path
				d="M20,85 L32,69 L69,69 L81,85"
				fill="none"
				stroke="#e2542e"
				strokeWidth={1.4}
				strokeLinejoin="round"
			/>
			<circle cx={30} cy={82} r={1.6} fill="#0a0a0d" />
			<circle cx={40} cy={78.5} r={1.6} fill="#0a0a0d" />
			<circle cx={50} cy={76} r={1.6} fill="#0a0a0d" />
			<circle cx={60} cy={78.5} r={1.6} fill="#0a0a0d" />
			<circle cx={70} cy={82} r={1.6} fill="#0a0a0d" />
			<circle cx={16} cy={81} r={1.6} fill="#0a0a0d" />
			<circle cx={84} cy={81} r={1.6} fill="#0a0a0d" />
			{/* White hub with a dark maroon ring/spokes — the reference's reels,
          not the cream-on-near-black pair this used to have. */}
			<GearReel cx={35} cy={45.5} r={8} hub="#ffffff" spoke="#7a2f2f" />
			<GearReel cx={65} cy={45.5} r={8} hub="#ffffff" spoke="#7a2f2f" />
		</svg>
	);
}

// Modeled on docs/formats/cassette_design_2.png: a light gray shell, a
// striped label window (cream/teal/yellow/orange/red), the black spool
// housing with its tapered tape-window notches, corner rivets, a bottom
// notch tab, and the little side-locking nubs. Same static-body rule as
// CassetteRetro — only the reels spin.
function CassetteColor() {
	return (
		<svg viewBox="0 0 100 100" width="100%" height="100%">
			<defs>
				<clipPath id="disc-cassette2-stripe-clip">
					<rect x={17} y={22} width={66} height={42} rx={4} />
				</clipPath>
			</defs>
			<rect
				x={9}
				y={15}
				width={82}
				height={70}
				rx={9}
				fill="#c9cbce"
				stroke="#1c1c1f"
				strokeWidth={2.4}
			/>
			<rect x={17} y={22} width={66} height={42} rx={4} fill="#141416" />
			<g clipPath="url(#disc-cassette2-stripe-clip)">
				<rect x={17} y={22} width={66} height={9} fill="#f1efe9" />
				<rect x={17} y={31} width={66} height={7} fill="#1f9e93" />
				<rect x={17} y={38} width={66} height={7} fill="#f5b731" />
				<rect x={17} y={45} width={66} height={7} fill="#f0812e" />
				<rect x={17} y={52} width={66} height={12} fill="#e8412a" />
			</g>
			<rect x={21} y={33} width={58} height={20} rx={4} fill="#141416" />
			<path d="M45,38 L43,48 L48,48 L49,38 Z" fill="#e9e3d6" />
			<path d="M55,38 L57,48 L52,48 L51,38 Z" fill="#e9e3d6" />
			<circle cx={14} cy={21} r={1.8} fill="#1c1c1f" />
			<circle cx={86} cy={21} r={1.8} fill="#1c1c1f" />
			{/* Bottom-corner rivets get the "donut" ring style (a light center
          punched into the dark dot) to match the reference — the two
          top-corner ones above stay plain solid, same as it shows there. */}
			<circle cx={14} cy={79} r={2} fill="#1c1c1f" />
			<circle cx={14} cy={79} r={0.8} fill="#c9cbce" />
			<circle cx={86} cy={79} r={2} fill="#1c1c1f" />
			<circle cx={86} cy={79} r={0.8} fill="#c9cbce" />
			{/* Bottom trapezoid panel — same reference-measured shape as
          CassetteRetro's: narrow at the top, opening wider toward the
          body's bottom edge (half a long hexagon, not a triangle) — with
          its 5 rivets arced (center-high, donut style). */}
			{/* Same open-bottom treatment as CassetteRetro's panel above. */}
			<path d="M33,68 L67,68 L82,85 L19,85 Z" fill="#c9cbce" />
			<path
				d="M19,85 L33,68 L67,68 L82,85"
				fill="none"
				stroke="#1c1c1f"
				strokeWidth={2}
				strokeLinejoin="round"
			/>
			<circle cx={29} cy={80} r={1.8} fill="#1c1c1f" />
			<circle cx={40} cy={77} r={1.8} fill="#1c1c1f" />
			<circle cx={50} cy={74} r={1.8} fill="#1c1c1f" />
			<circle cx={50} cy={74} r={0.7} fill="#c9cbce" />
			<circle cx={60} cy={77} r={1.8} fill="#1c1c1f" />
			<circle cx={71} cy={80} r={1.8} fill="#1c1c1f" />
			{/* Side-locking nubs — measured off the reference with a grid overlay:
          they sit low, roughly level with the bottom trapezoid panel, not
          centered on the reels. */}
			<rect
				x={4}
				y={61}
				width={7}
				height={13}
				rx={2}
				fill="#c9cbce"
				stroke="#1c1c1f"
				strokeWidth={2.4}
			/>
			<rect
				x={89}
				y={61}
				width={7}
				height={13}
				rx={2}
				fill="#c9cbce"
				stroke="#1c1c1f"
				strokeWidth={2.4}
			/>
			<GearReel cx={35} cy={44} r={8} hub="#ffffff" spoke="#141416" />
			<GearReel cx={65} cy={44} r={8} hub="#ffffff" spoke="#141416" />
		</svg>
	);
}

/** Loading visual shown while the widget is mid-transition between tracks.
 * Purely presentational and self-contained — Vinyl/Cassette animate via
 * SMIL (`animateTransform`), Cd via an inline `<style>` tag it carries with
 * it — either way there's no external CSS dependency, so this can be
 * dropped anywhere at any size. */
export default function DiscTransition({
	type,
	accentColor,
}: DiscTransitionProps) {
	switch (type) {
		case "vinyl":
			return <Vinyl accentColor={accentColor} />;
		case "cd":
			return <Cd />;
		case "cassette1":
			return <CassetteRetro />;
		case "cassette2":
			return <CassetteColor />;
	}
}
