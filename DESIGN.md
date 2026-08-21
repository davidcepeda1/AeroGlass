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
  led-cyan: "#4fd1ff"
  led-violet: "#b18bfa"
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
  wave-bar: "2px"
spacing:
  card-padding: "12px 24px"
  card-margin: "30px"
  content-gap: "16px"
  controls-gap: "10px"
  wave-gap: "3px"
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

AeroGlass is a near-black, near-monochrome liquid glass widget, built to a user-supplied reference CSS file rather than an internally invented material. It rejects color as the source of identity: there is no accent hue anywhere in the system, only translucency, blur, and light/dark gradient tension across two stacked glass surfaces. The card itself is not a fixed-size stadium/pill — it is `width: fit-content` (200-400px) with a `40px` rounded-rectangle corner, sizing to whatever title/artist text it holds rather than the reverse. Two earlier internally-generated directions — a blue-violet "Aero Glass" pane with SVG-lit gumdrop buttons, and a cyan-violet glowing dash-row indicator — were built, shown to the user, and explicitly rejected ("no me convence"); neither survives in the shipped code and neither is part of this system.

The material reads as thickness, not flatness, through a deliberate two-layer construction: `.card` itself is a faint black glass base (`rgba(0,0,0,0.1)`, `blur(5px)`), and `.card::before` is a second, separately-blurred liquid layer on top of it (`blur(50px) saturate(200%) brightness(1.1)`) carrying a 190deg dark-to-light gradient and asymmetric top/bottom borders. This double-blur stack, not a single translucent rectangle, is what makes the surface read as liquid glass rather than generic glassmorphism.

This is a single-surface native Tauri desktop widget (460×170px window, no OS decorations, borderless, always-on-top, non-resizable), not a page or a component library serving multiple breakpoints. Every rule below describes the one card and the controls on it.

**Key Characteristics:**
- Near-black, near-monochrome glass — no accent color anywhere in the system
- Two stacked glass layers (`.card` base + `.card::before` liquid overlay) as the signature material technique
- Card sizes to content (`fit-content`, 200-400px), not a fixed pill silhouette
- Only the primary play/pause button has a button body; prev/next are bare, icon-only controls
- Title gets a hover-triggered horizontal marquee with an edge-mask fade; the artist line never does
- Playback indicator is 4 transform-scaled bars (no glow, no color, no height-based animation)
- Track changes fade+slide via toggled `fadeIn`/`fadeOut` classes, not a plain opacity transition
- Window dragging lives on `.card`, `.icon-container`, and `.text-info` — never on `.controls`

## Colors

The palette is monochrome: every color is white or black at varying opacity, layered to build depth rather than hue.

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
**The No-Accent Rule.** No color in this system carries hue *except the playback indicator*; every other token is white or black at a chosen opacity. Identity comes from layering and blur, not a saturated accent — the one deliberate exception is the wave bars, kept as the single "live signal" accent because the user asked for it back explicitly after the monochrome pass.

- **LED Cyan-Violet** (`#4fd1ff` → `#b18bfa`): the `.wave-bar` gradient fill, paired with a glow (`box-shadow: 0 0 4px rgba(120,190,255,.85), 0 0 7px rgba(150,120,255,.5)`, removed entirely when paused). The only hued color in the system.

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

The card is not a fixed-dimension element: `width: fit-content` (`min-width: 200px`, `max-width: 400px`), `height: fit-content`, `border-radius: 40px`, `padding: 12px 24px`, sitting with a `30px` margin inside the 460×170px transparent window so its footprint bleeds into the surrounding space rather than being clipped at the window edge. Content is a single horizontal flex row (`.content`, `gap: 16px`): a 70×70px cover-art tile, then a title/artist/wave stack that overflows-hidden and flexes, then the three controls pinned right via `margin-left: auto` (`.controls`, `gap: 10px`, `padding-left: 10px`). There is no responsive breakpoint — this is a fixed native desktop widget, not a viewport.

## Elevation & Depth

Depth comes from the two-layer glass stack (see Colors' Two-Layer Glass Rule) plus conventional drop shadows on discrete elements — not from a shared glow token or an ambient ramp. There is no color-glow anywhere in this system: shadows are always neutral black or white, never tinted.

### Shadow Vocabulary
- **Liquid inset volume** (`box-shadow: inset 0 0 10px rgba(255,255,255,0.05)` on `.card::before`): a faint inner sheen that gives the overlay layer volume without adding a visible ring.
- **Cover frame drop** (`box-shadow: 0 4px 12px rgba(0,0,0,0.2)` on `.icon-container`, plus a `1px solid rgba(255,255,255,0.1)` border): lifts the album-art tile a touch off the card.
- **Primary button rest** (`box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.05)`): elevation plus interior glass volume on the one button with a body.
- **Primary button hover** (`box-shadow: 0 8px 20px rgba(0,0,0,0.4), inset 0 0 12px rgba(255,255,255,0.1), 0 0 15px rgba(255,255,255,0.2)`): the shadow deepens and a soft white (not colored) glow appears — the only "glow" in the system, and it is neutral white, on hover only.
- **Icon drop shadow** (`filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))` on all `button svg`): keeps icon glyphs legible over the glass regardless of what's behind the window.

### Named Rules
**The Neutral-Shadow Rule.** Every shadow and glow in this system is black or white; nothing is tinted. A colored glow was part of the rejected Aero Glass world and does not belong here.

## Shapes

The card's corner is a `40px` rounded rectangle, not a stadium/pill — its silhouette is defined by content-driven width (`fit-content`, 200-400px), so the corner radius reads as consistent rounding rather than a capsule endpoint. Every circular element (primary and secondary buttons) is a true `50%` circle; the cover-art frame is a softer `16px` rounded square; wave bars carry a small `2px` radius. There is no sharp corner anywhere in the system.

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
A row of 4 bars (`.wave-container`/`.wave-bar`, `10px` wide, `2px` radius, `3px` gap), each independently delayed/duration-randomized via inline style from `generateWaveConfig()`. Animation is `transform: scaleY(0.5 → 1.5)` combined with `opacity: 0.6 → 1` on a shared `wave` keyframe. Bars carry the system's one hued color, the **LED Cyan-Violet** gradient with a matching glow, restored after the user asked for the colored bars back specifically; the glow drops out entirely (`box-shadow: none`, `opacity: 0.6`, frozen at `scaleY(0.5)`) when paused, so a dead indicator reads as dead, not mid-pulse.

### Track-Change Transition (signature behavior)
On track change, `.text-info` toggles between `fade-out` (`fadeOut` keyframe: opacity 1→0, `translateY(0)→translateY(-5px)`) and `fade-in` (`fadeIn` keyframe: opacity 0→1, `translateY(5px)→translateY(0)`), each 0.3s ease-out, with the wave pattern regenerated mid-transition. **The Toggled-Class Fade Rule.** Track-change fades are driven by toggled animation classes with a vertical offset, not a plain CSS opacity transition — the slight `5px` slide is part of the identity of a track change, not incidental.

## Do's and Don'ts

### Do:
- **Do** build any new glass surface as two stacked layers with independently tuned blur values, matching `.card`/`.card::before` — never a single translucent rectangle.
- **Do** size the card to its content (`fit-content`, bounded 200-400px) rather than forcing a fixed width or a stadium silhouette.
- **Do** keep every shadow and glow neutral (black or white); never tint a shadow with color.
- **Do** reserve the button body for the single primary action; keep prev/next transparent until hovered.
- **Do** drive the playback indicator and any future "live" signal through `transform`/`opacity`, not `box-shadow` glow or color shift.
- **Do** put `data-tauri-drag-region` only on non-interactive regions (`.card`, `.icon-container`, `.text-info`), never on `.controls` or its buttons.

### Don't:
- **Don't** reintroduce color/hue as a source of identity — the blue-violet "Aero Glass" pane and its amber gumdrop buttons were explicitly rejected and are not part of this system.
- **Don't** reintroduce a glowing colored dash-row or per-element `box-shadow` glow as a resting-state decoration — the cyan-violet dash indicator was rejected along with the rest of that world.
- **Don't** apply the title's hover marquee treatment to the artist line or any other truncated text; it is a title-only behavior.
- **Don't** design against a resizable-viewport assumption; this is a fixed 460×170px native window with no breakpoints.
