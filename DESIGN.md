---
name: AeroGlass
description: A near-black liquid-glass "now playing" widget — a fit-content rounded card built from two stacked translucent layers, not a saturated color story.
colors:
  glass-base-black: "rgba(0, 0, 0, 0.1)"
  liquid-shadow-black: "rgba(0, 0, 0, 0.4)"
  liquid-light-low: "rgba(255, 255, 255, 0.05)"
  liquid-light-high: "rgba(255, 255, 255, 0.15)"
  rim-top: "rgba(255, 255, 255, 0.288)"
  rim-bottom: "rgba(255, 255, 255, 0.05)"
  ink-white: "rgba(255, 255, 255, 0.95)"
  ink-white-muted: "rgba(255, 255, 255, 0.6)"
  control-white: "rgba(255, 255, 255, 0.9)"
  control-white-dim: "rgba(255, 255, 255, 0.5)"
  frame-white-faint: "rgba(255, 255, 255, 0.1)"
  shadow-black: "rgba(0, 0, 0, 0.2)"
  eq-blue: "#2f6bff"
  eq-cyan: "#22c7c0"
  eq-green: "#3ee85a"
  eq-peak-green: "#7cff8c"
typography:
  title:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "0.3px"
  label:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    color: "{colors.ink-white-muted}"
rounded:
  card: "40px"
  cover: "16px"
  control: "50%"
  eq-seg: "0.5px"
spacing:
  card-padding: "12px 24px"
  card-margin: "30px"
  content-gap: "16px"
  controls-gap: "10px"
  eq-gap: "2px"
components:
  button-primary:
    backgroundColor: "{colors.frame-white-faint}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    size: "46px"
  button-primary-hover:
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.control-white-dim}"
    rounded: "{rounded.control}"
    size: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.frame-white-faint}"
    textColor: "#ffffff"
  card:
    backgroundColor: "{colors.glass-base-black}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
    width: "fit-content"
---

# Design System: AeroGlass

## Overview

**Creative North Star: "Liquid Glass Pane"**

AeroGlass is a near-black, near-monochrome liquid glass widget, built to a user-supplied reference CSS file rather than an internally invented material. It rejects color as the source of identity for the card itself: there is no accent hue anywhere in the glass, only translucency, blur, and light/dark gradient tension across two stacked glass surfaces. The card itself is not a fixed-size stadium/pill — it is `width: fit-content` (200-400px) with a `40px` rounded-rectangle corner, sizing to whatever title/artist text it holds rather than the reverse. Two earlier internally-generated directions — a blue-violet "Aero Glass" pane with SVG-lit gumdrop buttons, and a cyan-violet glowing dash-row indicator — were built, shown to the user, and explicitly rejected ("no me convence"); neither survives in the shipped code and neither is part of this system.

The material reads as thickness, not flatness, through a deliberate two-layer construction: `.card` itself is a faint black glass base (`rgba(0,0,0,0.1)`, `blur(5px)`), and `.card::before` is a second, separately-blurred liquid layer on top of it (`blur(50px) saturate(200%) brightness(1.1)`) carrying a 190deg dark-to-light gradient and asymmetric top/bottom borders. This double-blur stack, not a single translucent rectangle, is what makes the surface read as liquid glass rather than generic glassmorphism.

This is a single-surface native Tauri desktop widget (460×170px window, no OS decorations, borderless, always-on-top, non-resizable), not a page or a component library serving multiple breakpoints. Every rule below describes the one card and the controls on it.

**Key Characteristics:**
- Near-black, near-monochrome glass — no accent color anywhere in the card material itself
- Two stacked glass layers (`.card` base + `.card::before` liquid overlay) as the signature material technique
- Card sizes to content (`fit-content`, 200-400px), not a fixed pill silhouette
- Only the primary play/pause button has a button body; prev/next are bare, icon-only controls
- Title gets a hover-triggered horizontal marquee with an edge-mask fade; the artist line never does
- Playback indicator is a 12-bar segmented graphic equalizer, matching a real reference image, living inside the text column rather than as a separate flex sibling
- Track changes fade+slide via toggled `fadeIn`/`fadeOut` classes, not a plain opacity transition
- Window dragging lives on `.card`, `.icon-container`, and `.text-info` — never on `.controls`

## Colors

The palette is monochrome: every color is white or black at varying opacity, layered to build depth rather than hue. The one deliberate exception is the segmented equalizer, whose row colors are a fixed, referenced convention borrowed from classic hardware EQs, not an invented accent.

### Primary
- **Liquid Base Black** (`rgba(0, 0, 0, 0.1)`): the `.card`'s own background — the faint dark glass base every other layer sits on top of.
- **Liquid Shadow Black** (`rgba(0, 0, 0, 0.4)`): the dark end of `.card::before`'s 190deg gradient, reads as glass thickness/shadow at the top of the pane.
- **Liquid Light Low → High** (`rgba(255, 255, 255, 0.05)` → `rgba(255, 255, 255, 0.15)`): the gradient's mid and bottom stops, a soft lift toward the bottom edge that reads as light passing through the glass.

### Neutral
- **Ink White** (`rgba(255, 255, 255, 0.95)`): the track title, with a `0 2px 4px rgba(0,0,0,0.2)` text-shadow for legibility over arbitrary desktop wallpaper.
- **Ink White Muted** (`rgba(255, 255, 255, 0.6)`): the artist line — an opacity step off Ink White, not a separate hue.
- **Control White** (`rgba(255, 255, 255, 0.9)`): the default icon color for all buttons before per-variant dimming.
- **Control White Dim** (`rgba(255, 255, 255, 0.5)`): the resting icon color on prev/next, brightening to full white on hover.
- **Rim Top / Rim Bottom** (`rgba(255, 255, 255, 0.288)` / `rgba(255, 255, 255, 0.05)`): the `.card::before` top and bottom borders — an intentionally asymmetric edge, brighter at top (catching light) than bottom.
- **Frame White Faint** (`rgba(255, 255, 255, 0.1)`): shared translucent fill for the primary button body and the secondary buttons' hover background.

### Named Rules
**The No-Accent Rule.** No color in the glass, buttons, or text carries hue; every one of those tokens is white or black at a chosen opacity. Identity comes from layering and blur, not a saturated accent. The segmented equalizer is the deliberate exception: it uses a fixed row-position color ramp because that ramp *is* the referenced graphic-EQ device (see Playback Indicator) — it is a borrowed convention, not an invented brand accent, and it does not license adding hue anywhere else.

- **Equalizer Ramp — Blue / Cyan / Green** (`#2f6bff` → `#22c7c0` → `#3ee85a`): fixed bottom-to-top segment colors on the playback indicator, keyed to row position (height), never to which bar or which frequency band it is. See Playback Indicator.
- **Equalizer Peak Green** (`#7cff8c`): the peak-hold marker line, a distinct brighter green from the top segment color so the momentary peak reads as a separate signal from the lit column beneath it.

**The Two-Layer Glass Rule.** Every "liquid glass" surface in this system is built from two stacked layers with independent blur radii — a faint base fill (`blur(5px)`) and a separately-blurred gradient overlay (`blur(50px) saturate(200%) brightness(1.1)`) — never a single translucent rectangle with one blur value.

## Typography

**Body/Title Font:** `'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif`
**Label Font:** same family, lighter weight

**Character:** A single system font family carried across two sizes/weights — Segoe UI (with its Variable Display sibling leading the stack) is the deliberate Windows-native face; the widget never needs a second family or a display-scale role.

### Hierarchy
- **Title** (600, 15px, 0.3px letter-spacing, single line): the track title, `color: {colors.ink-white}`. Clipped with a `mask-image` edge fade rather than a hard `text-overflow: ellipsis` cut, and gains a horizontal marquee on hover (see Components).
- **Label** (400, 13px, single line): the artist name, `color: {colors.ink-white-muted}`, truncates with `text-overflow: ellipsis` — no hover marquee.

### Named Rules
**The Marquee-Is-Title-Only Rule.** The hover-triggered horizontal scroll (`h1:hover span`, `scroll-text` 8s loop) and its mask-edge fade apply only to the title. The artist line always truncates statically; giving it the same treatment would compete with the title for attention in a widget this small.

## Layout

The card is not a fixed-dimension element: `width: fit-content` (`min-width: 200px`, `max-width: 400px`), `height: fit-content`, `border-radius: 40px`, `padding: 12px 24px`, sitting with a `30px` margin inside the 460×170px transparent window so its footprint bleeds into the surrounding space rather than being clipped at the window edge. Content is a single horizontal flex row (`.content`, `gap: 16px`): a 70×70px cover-art tile, then a title/artist/equalizer stack that overflows-hidden and flexes, then the three controls pinned right via `margin-left: auto` (`.controls`, `gap: 10px`, `padding-left: 10px`). The equalizer is a third stacked row inside that text column (`.text-info`), not a new flex sibling of `.content` — it was rebuilt smaller specifically to avoid widening the row past the original 460px window. There is no responsive breakpoint — this is a fixed native desktop widget, not a viewport.

## Elevation & Depth

Depth comes from the two-layer glass stack (see Colors' Two-Layer Glass Rule) plus conventional drop shadows on discrete elements — not from a shared glow token or an ambient ramp. There is no color-glow anywhere in the glass/button/text system: those shadows are always neutral black or white, never tinted. The equalizer's lit segments carry a small colored glow (`box-shadow: 0 0 3px var(--seg-color)`) matched to each segment's own row color — this is scoped to the equalizer only, and is a legibility device for a tiny LED-style readout, not a precedent for tinted shadows elsewhere.

### Shadow Vocabulary
- **Liquid inset volume** (`box-shadow: inset 0 0 10px rgba(255,255,255,0.05)` on `.card::before`): a faint inner sheen that gives the overlay layer volume without adding a visible ring.
- **Cover frame drop** (`box-shadow: 0 4px 12px rgba(0,0,0,0.2)` on `.icon-container`, plus a `1px solid rgba(255,255,255,0.1)` border): lifts the album-art tile a touch off the card.
- **Primary button rest** (`box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.05)`): elevation plus interior glass volume on the one button with a body.
- **Primary button hover** (`box-shadow: 0 8px 20px rgba(0,0,0,0.4), inset 0 0 12px rgba(255,255,255,0.1), 0 0 15px rgba(255,255,255,0.2)`): the shadow deepens and a soft white (not colored) glow appears — the only "glow" in the glass/button system, and it is neutral white, on hover only.
- **Icon drop shadow** (`filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))` on all `button svg`): keeps icon glyphs legible over the glass regardless of what's behind the window.
- **Equalizer segment glow** (`box-shadow: 0 0 3px var(--seg-color)` on `.eq-seg.lit`; `0 0 4px #7cff8c` on `.eq-peak`): a tight self-colored glow on each lit LED segment and the peak marker — see Elevation intro for scope.

### Named Rules
**The Neutral-Shadow Rule.** Every shadow and glow on the glass, buttons, and text is black or white; nothing there is tinted. A colored glow was part of the rejected Aero Glass world and does not belong in that layer. This rule does not extend to the equalizer's own segment glow, which is a scoped LED-legibility device (see Elevation intro and Playback Indicator).

## Shapes

The card's corner is a `40px` rounded rectangle, not a stadium/pill — its silhouette is defined by content-driven width (`fit-content`, 200-400px), so the corner radius reads as consistent rounding rather than a capsule endpoint. Every circular element (primary and secondary buttons) is a true `50%` circle; the cover-art frame is a softer `16px` rounded square; equalizer segments carry a hairline `0.5px` radius, just enough to soften an otherwise sharp LED rectangle. There is no sharp corner anywhere in the system.

## Components

### Buttons
- **Shape:** primary and secondary buttons are both full circles (`border-radius: 50%`). Secondary buttons have no visible body until hovered.
- **Primary (play/pause):** 46px circle, translucent white glass body (`rgba(255,255,255,0.1)`, `backdrop-filter: blur(12px)`), border brighter at top (`rgba(255,255,255,0.3)`) than the rest (`rgba(255,255,255,0.15)`) — the same top-lit asymmetry as the card's own rim. Icon 24px, `margin-left: 2px` optical correction. The only control with a button body.
- **Secondary (prev/next):** 32px hit area, fully transparent at rest, icon-only in `rgba(255,255,255,0.5)`. On hover, gains a `rgba(255,255,255,0.1)` fill, brightens to full white, scales to `1.1`, and picks up a faint white glow (`0 0 10px rgba(255,255,255,0.1)`) — the background itself is a hover-only reveal, not a resting state.
- **Active:** both variants scale down (`0.95`) on press; primary also drops its background to `rgba(255,255,255,0.15)` and flattens its shadow.
- **Icons:** `lucide-react` outline set (`Play`, `Pause`, `SkipBack`, `SkipForward`), filled solid, 16-24px depending on button size, each with the shared drop-shadow.

### Cards / Containers
- **Corner Style:** `40px` rounded rectangle (see Shapes) — not a pill.
- **Background:** two-layer stack — `.card` (`rgba(0,0,0,0.1)`, `blur(5px)`) plus `.card::before` (190deg gradient, `blur(50px) saturate(200%) brightness(1.1)`, asymmetric top/bottom border, inset box-shadow). See Colors' Two-Layer Glass Rule.
- **Shadow Strategy:** see Elevation & Depth.
- **Border:** no border on `.card` itself; the asymmetric top/bottom border lives on `.card::before`.
- **Internal Padding:** `12px 24px`.
- **Sizing:** `width: fit-content` (200-400px), `height: fit-content` — content-driven, not fixed.

### Cover Art Frame
- **Shape:** 70×70px, `16px` radius, `overflow: hidden`.
- **Treatment:** a plain framed image tile (`1px solid rgba(255,255,255,0.1)` border, `0 4px 12px rgba(0,0,0,0.2)` drop shadow) — no glass-highlight or grain treatment layered over the art; it reads as a distinct, simpler surface than the card itself.

### Playback Indicator (signature component)
A 12-bar segmented graphic equalizer (`.eq`/`.eq-bar`), rebuilt to match a user-supplied reference image (`docs/barra.png`) and to a classic Winamp/iTunes hardware-EQ read — a deliberate change from the earlier simple glowing-dash row. Each bar is a `column-reverse` flex column of 6 discrete LED segments (`.eq-seg`, `6px` wide, `2px` tall, `1px` gap), so array index 0 renders at the bottom and segments light bottom-up as level rises. Segment color is a **fixed row-position ramp**, bottom→top: blue (`#2f6bff`) → cyan (`#22c7c0`) → green (`#3ee85a`) — every bar uses the same three-color ramp keyed to row height, not to which bar it is or which frequency band that bar represents; this is the classic graphic-EQ read where color encodes loudness-row, not identity.

Each bar also carries an independent **peak-hold marker** (`.eq-peak`, `#7cff8c`, distinct from the top segment's green): it jumps instantly to match a rising level, then decays on its own, driven by a single authoritative `setInterval` tick that decays-then-re-raises-to-current-level in one step, clamped so it can never render above the top segment row (`SEGMENTS - 1`). **The Single-Clock Peak Rule.** Peak-hold decay must be driven by one interval that reads the live level directly, never by a per-render "bump on level update" effect racing a separate decay interval — the two-effect version was built and shipped a real bug where the peak marker appeared stuck, because level updates arrive far faster than any decay tick and always won the race.

Levels come from the real `audio-levels` Tauri event (12 FFT bands, `BAR_COUNT = 12` in the Rust backend) when audio capture is active; when no event has arrived for 1.5s, the widget falls back to a decorative per-bar random-walk (`randomLevels()`, regenerated every 140ms) purely so the equalizer keeps moving instead of sitting empty — this fallback carries no meaning about actual playback and must never be confused with real audio data in future work.

**No-signal state:** `.eq-paused` dims every lit segment to the same unlit background color and sets peak-marker opacity to `0` (hidden entirely) rather than freezing the peak in its last position — a paused/silent equalizer must read as off, not as a frozen snapshot of the last playing moment.

**The Small-Footprint Rule.** The equalizer is sized to fit inside the original small card (max-width 400px, 460px window) and lives as a third stacked row inside `.text-info`, under the artist line — not as a new flex sibling in `.content` that would widen the row. An earlier full-width build was rejected by the user for not matching the widget's established small footprint; this compact, in-column placement is the corrected, shipped version.

### Track-Change Transition (signature behavior)
On track change, `.text-info` toggles between `fade-out` (`fadeOut` keyframe: opacity 1→0, `translateY(0)→translateY(-5px)`) and `fade-in` (`fadeIn` keyframe: opacity 0→1, `translateY(5px)→translateY(0)`), each 0.3s ease-out. **The Toggled-Class Fade Rule.** Track-change fades are driven by toggled animation classes with a vertical offset, not a plain CSS opacity transition — the slight `5px` slide is part of the identity of a track change, not incidental.

## Do's and Don'ts

### Do:
- **Do** build any new glass surface as two stacked layers with independently tuned blur values, matching `.card`/`.card::before` — never a single translucent rectangle.
- **Do** size the card to its content (`fit-content`, bounded 200-400px) rather than forcing a fixed width or a stadium silhouette.
- **Do** keep every glass/button/text shadow and glow neutral (black or white); never tint a shadow with color outside the equalizer's own scoped LED glow.
- **Do** reserve the button body for the single primary action; keep prev/next transparent until hovered.
- **Do** drive the equalizer's peak-hold decay from a single authoritative interval that reads live levels directly, never from a separate per-update "bump" effect racing a decay effect.
- **Do** keep any future audio-reactive component sized to fit the existing 460px window and 400px card — build compact and in-column first, not full-width.
- **Do** put `data-tauri-drag-region` only on non-interactive regions (`.card`, `.icon-container`, `.text-info`), never on `.controls` or its buttons.

### Don't:
- **Don't** reintroduce color/hue as a source of identity on the glass, buttons, or text — the blue-violet "Aero Glass" pane and its amber gumdrop buttons were explicitly rejected and are not part of this system.
- **Don't** key equalizer segment color to bar index or frequency band; it is keyed to row position (height) only, matching the classic graphic-EQ convention this component was built to reference.
- **Don't** freeze the peak-hold marker or lit segments in a "last known" state when playback stops; the no-signal state hides the peak and dims lit segments to the unlit background color instead.
- **Don't** apply the title's hover marquee treatment to the artist line or any other truncated text; it is a title-only behavior.
- **Don't** design against a resizable-viewport assumption; this is a fixed 460×170px native window with no breakpoints.
