# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Tauri v2 (Rust backend) + React 19 + TypeScript + Vite. Existing codebase; not delegated.

## Users

Primary: the author, using it daily as a floating "now playing" widget on their own Linux/Windows desktop. Secondary (confirmed intent, not yet active): other desktop users if/when the project is published as open source, so the visual identity should read as a real, presentable product rather than a personal hack.

## Product Purpose

A tiny always-on-top, borderless desktop widget that shows the current system media session (title, artist, playback state) and lets the user play/pause/skip without switching windows or touching the mouse away from what they're doing. Reads real OS media state via Windows Media Session API and Linux MPRIS/D-Bus (already implemented and working).

## Positioning

A cross-platform (Windows + Linux) native "now playing" glass overlay — most equivalents are Windows-only or web-extension-only. Value equally: it must look genuinely covetable sitting on the desktop, and it must be a friction-free, glanceable control surface.

## Operating Context

Floating window, 460x170px, no OS decorations, transparent background, always-on-top, hidden from taskbar. The visible pill-shaped card is `width: fit-content` (200-400px) centered inside that window with a 30px margin, so its drop shadow/glow can bleed into the surrounding transparent space instead of being clipped at the window edge. Sits over an arbitrary desktop wallpaper/content the user cannot control, in both light and dark environments. Polled every 1s from the real backend; track changes trigger a fade transition already implemented in App.tsx. Window dragging uses Tauri's `data-tauri-drag-region` attribute (not `-webkit-app-region`, which webkit2gtk on Linux doesn't support reliably).

## Capabilities and Constraints

- Real backend already wired: `check_music`/`control_media` Tauri commands, Linux MPRIS working end-to-end (tested live), Windows Media Session API implemented but unverified (no Windows machine available).
- Window must stay a small fixed-size horizontal widget, non-resizable; currently 460x170px to let the pill card's shadow bleed into transparent margin (see Operating Context).
- Must keep functioning with the existing data contract: `{ title, artist, isPlaying }` and prev/play-pause/next actions.
- Typography decided: "Segoe UI" first in the stack, deliberately — the actual Vista/7 Aero-era system typeface, not an accidental system-ui fallback. Renders natively on Windows; falls back gracefully elsewhere.

## Brand Commitments

Name "AeroGlass" is fixed. The visual system is pinned to two concrete references the user supplied directly, which supersede any earlier stylistic exploration: `docs/template.png` (a pill-shaped widget screenshot, establishing the silhouette/layout) and a specific hand-written/sourced CSS file the user pasted verbatim (establishing the actual material — a subtle, near-black "liquid glass" look: `rgba(0,0,0,0.1)` base + a blurred/saturated gradient overlay layer, not a saturated colored glass). Two earlier internally-generated directions (a blue-violet "Aero Glass" world, and a warm-amber gumdrop-button system) were built, shown to the user, and explicitly rejected ("no me convence") in favor of matching these references — they are not part of the current system and should not be revived without the user asking again.

## Evidence on Hand

None (no logos or copy commitments beyond the code itself). Real album art is now wired end-to-end: `SongInfo.coverArt` (Linux: MPRIS `mpris:artUrl`, passed through as-is for http(s) sources or read+base64-inlined for `file://` sources; Windows: `Thumbnail()`'s raw stream, base64-inlined — unverified, no Windows machine available). The gradient SVG (`src/assets/cover-placeholder.svg`) is now only the fallback for when no session/art is available.

## Product Principles

1. The user's supplied reference (template.png + pasted CSS) is the visual world, followed closely rather than reinterpreted — a subtle, near-monochrome liquid glass, not a saturated color story.
2. It must work as a tiny persistent object glanced at for a fraction of a second, not as a page — hierarchy and contrast must survive at this widget's scale over unpredictable wallpapers.
3. Aesthetic ambition and control speed are co-equal goals; a beautiful widget that's annoying to click, or a fast widget that's forgettable, both fail the brief.
4. Ship real, working UI — no placeholder chrome that doesn't reflect live `isPlaying`/track data.

## Accessibility & Inclusion

No formal requirement established. Controls should remain reachable/clickable at their current or larger size; no stated screen-reader requirement for this always-on-top overlay class of app.
