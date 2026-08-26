import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import coverPlaceholder from "./assets/cover-placeholder.svg";
import EqualizerBars, { type EqualizerStyle } from "./EqualizerBars";
import DiscTransition, { type DiscType } from "./DiscTransition";
import { useAlbumPalette } from "./lib/useAlbumPalette";
import "./App.css";

const EQ_STYLES: EqualizerStyle[] = ["segmented", "pill"];
const DISC_TYPES: DiscType[] = ["vinyl", "cd", "cassette"];

const WAVE_BARS = 12;
// Track-change transition: the pill collapses into a spinning disc, holds,
// then expands back out. See the `phase` state machine below.
const DISC_SIZE_PX = 96;
const COLLAPSE_MS = 320;
const SPIN_MIN_MS = 500;
const EXPAND_MS = 320;
// Safety net only: MPRIS/WinRT push updates instantly, but not every player
// implements the change signals reliably, so poll slowly in the background
// too, just so the widget can never go stale forever.
const FALLBACK_POLL_INTERVAL_MS = 10_000;
// If no "audio-levels" event arrives for this long, treat the system audio
// capture as unavailable/stalled and fall back to the decorative animation.
const AUDIO_LEVELS_TIMEOUT_MS = 1500;
const DECORATIVE_TICK_MS = 140;

interface SongInfo {
  title: string;
  artist: string;
  isPlaying: boolean;
  coverArt: string | null;
}

const EMPTY_SONG: SongInfo = {
  title: "",
  artist: "",
  isPlaying: false,
  coverArt: null,
};

function trackKey(song: SongInfo) {
  return `${song.title}|${song.artist}`;
}

function randomLevels(count: number) {
  return Array.from({ length: count }, () => 0.15 + Math.random() * 0.75);
}

/** Picks a disc type at random, excluding whichever one played last — same
 * "don't repeat the last one" spirit as the wave pattern regen, so the
 * transition reads as varied instead of settling on one look. */
function pickDiscType(exclude: DiscType | null): DiscType {
  const options = DISC_TYPES.filter((t) => t !== exclude);
  return options[Math.floor(Math.random() * options.length)];
}

type TransitionPhase = "idle" | "collapsing" | "spinning" | "measuring" | "expanding";

function App() {
  const [displaySong, setDisplaySong] = useState<SongInfo>(EMPTY_SONG);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [discType, setDiscType] = useState<DiscType>("vinyl");
  // null = let CSS `fit-content` size the card (normal state); a number is
  // an inline px width locked in only while a transition is in flight, so
  // the width transition has two concrete endpoints to animate between.
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[] | null>(null);
  const [decorativeLevels, setDecorativeLevels] = useState(() =>
    randomLevels(WAVE_BARS),
  );
  const [eqStyle, setEqStyle] = useState<EqualizerStyle>("segmented");
  const lastLevelsAtRef = useRef(0);
  const trackKeyRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const isTransitioningRef = useRef(false);
  const pendingSongRef = useRef<SongInfo | null>(null);
  const lastDiscTypeRef = useRef<DiscType | null>(null);

  useEffect(() => {
    invoke<string>("get_visualizer_style")
      .then((style) => {
        if (EQ_STYLES.includes(style as EqualizerStyle)) {
          setEqStyle(style as EqualizerStyle);
        }
      })
      .catch(console.error);
  }, []);

  const cycleEqStyle = () => {
    setEqStyle((current) => {
      const next = EQ_STYLES[(EQ_STYLES.indexOf(current) + 1) % EQ_STYLES.length];
      invoke("set_visualizer_style", { style: next }).catch(console.error);
      return next;
    });
  };

  useEffect(() => {
    const unlisten = listen<number[]>("audio-levels", (event) => {
      lastLevelsAtRef.current = Date.now();
      setAudioLevels(event.payload);
    });

    const watchdog = setInterval(() => {
      if (Date.now() - lastLevelsAtRef.current > AUDIO_LEVELS_TIMEOUT_MS) {
        setAudioLevels((current) => (current === null ? current : null));
      }
    }, 500);

    return () => {
      unlisten.then((fn) => fn());
      clearInterval(watchdog);
    };
  }, []);

  // Decorative fallback: only runs while there's no real audio-levels feed,
  // so the equalizer still moves instead of sitting frozen/empty.
  useEffect(() => {
    if (audioLevels !== null) return;
    const id = setInterval(() => {
      setDecorativeLevels(randomLevels(WAVE_BARS));
    }, DECORATIVE_TICK_MS);
    return () => clearInterval(id);
  }, [audioLevels]);

  // Track-change transition: collapse the pill into a spinning disc, hold,
  // then expand back out with the new track already loaded. Runs once per
  // track change — if a change lands mid-transition, it just replaces the
  // pending song so a burst of prev/next clicks doesn't restart the
  // animation on every click, only shows the final destination.
  const beginDiscTransition = (song: SongInfo) => {
    pendingSongRef.current = song;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const nextDisc = pickDiscType(lastDiscTypeRef.current);
    lastDiscTypeRef.current = nextDisc;
    setDiscType(nextDisc);

    const el = cardRef.current;
    setCardWidth(el ? el.getBoundingClientRect().width : DISC_SIZE_PX);

    // Two-step width change (lock current px, then flip to the target on
    // the next frame) so the CSS transition has two concrete endpoints —
    // animating straight from `fit-content` doesn't reliably interpolate.
    requestAnimationFrame(() => {
      setCardWidth(DISC_SIZE_PX);
      setPhase("collapsing");
    });

    setTimeout(() => setPhase("spinning"), COLLAPSE_MS);

    setTimeout(() => {
      setDisplaySong(pendingSongRef.current ?? EMPTY_SONG);
      setPhase("measuring");
    }, COLLAPSE_MS + SPIN_MIN_MS);
  };

  // Once the new track's title/artist have committed to the DOM (still
  // hidden behind the disc), measure the pill's natural width for that
  // content and animate the expansion to exactly that size.
  useEffect(() => {
    if (phase !== "measuring") return;
    const el = cardRef.current;
    if (!el) {
      setPhase("expanding");
      return;
    }

    const prevCssText = el.style.cssText;
    el.style.transition = "none";
    // Inline styles win over the `.card--disc` class's fixed width
    // regardless of specificity, so this measures the real fit-content
    // size without the disc-shape override kicking back in.
    el.style.width = "fit-content";
    const naturalWidth = el.getBoundingClientRect().width;
    el.style.cssText = prevCssText;
    void el.offsetWidth; // flush the reset before re-enabling the transition

    setCardWidth(naturalWidth);
    setPhase("expanding");
  }, [phase]);

  // Separate from the "measuring" effect above: since that effect calls
  // setPhase("expanding") itself, a single effect keyed on `phase` would
  // immediately re-run on that same change and its cleanup would cancel
  // this timeout before it ever fires, leaving the widget stuck mid-expand.
  useEffect(() => {
    if (phase !== "expanding") return;
    const timeout = setTimeout(() => {
      setCardWidth(null);
      setPhase("idle");
      isTransitioningRef.current = false;
      pendingSongRef.current = null;
    }, EXPAND_MS);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    const applySong = (song: SongInfo) => {
      const key = trackKey(song);

      // Same track (or first paint): update in place, no transition needed.
      if (trackKeyRef.current === null || trackKeyRef.current === key) {
        trackKeyRef.current = key;
        if (isTransitioningRef.current) {
          pendingSongRef.current = song;
        } else {
          setDisplaySong(song);
        }
        return;
      }

      // Different track: run the disc-morph transition.
      trackKeyRef.current = key;
      beginDiscTransition(song);
    };

    const fetchNow = () => {
      invoke<SongInfo>("check_music").then(applySong).catch(console.error);
    };

    // Real-time updates: the backend pushes this the instant MPRIS (Linux)
    // or WinRT (Windows) reports a change, instead of us polling on a timer.
    const unlisten = listen<SongInfo>("song-changed", (event) => {
      applySong(event.payload);
    });

    // First paint can't rely on an event that may fire before this listener
    // is even attached, so fetch the current state once immediately too.
    fetchNow();

    const fallback = setInterval(fetchNow, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      unlisten.then((fn) => fn());
      clearInterval(fallback);
    };
  }, []);

  const eqPalette = useAlbumPalette(displaySong.coverArt);

  const hasTrack = displaySong.title !== "";
  const title = hasTrack ? displaySong.title : "No track playing";
  const artist = hasTrack ? displaySong.artist : "—";
  const isPlaying = displaySong.isPlaying;
  const eqLevels = audioLevels ?? decorativeLevels;
  const isDiscShape = phase === "collapsing" || phase === "spinning" || phase === "measuring";

  return (
    <main
      ref={cardRef}
      className={`card${isDiscShape ? " card--disc" : ""}`}
      style={cardWidth !== null ? { width: cardWidth } : undefined}
      data-tauri-drag-region
    >
      {phase !== "idle" && (
        <div className="disc-overlay">
          <DiscTransition type={discType} accentColor={eqPalette.peakColor} />
        </div>
      )}

      <div className="content" data-tauri-drag-region>
        <div className="icon-container" data-tauri-drag-region>
          <img
            src={displaySong.coverArt ?? coverPlaceholder}
            alt="Album cover"
            data-tauri-drag-region
          />
        </div>

        <div className="text-info" data-tauri-drag-region>
          <h1 data-tauri-drag-region>
            <span data-tauri-drag-region>{title}</span>
          </h1>
          <p data-tauri-drag-region>{artist}</p>
          <div
            className="eq-switcher"
            onClick={cycleEqStyle}
            title="Click to change visualizer style"
          >
            <EqualizerBars
              levels={eqLevels}
              isPlaying={isPlaying}
              style={eqStyle}
              palette={eqPalette.stops}
              peakColor={eqPalette.peakColor}
            />
          </div>
        </div>

        <div className="controls">
          <button
            className="btn-secondary"
            aria-label="Previous"
            onClick={() => invoke("control_media", { action: "prev" })}
          >
            <SkipBack size={16} fill="currentColor" />
          </button>
          <button
            className="btn-primary"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => invoke("control_media", { action: "play_pause" })}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button
            className="btn-secondary"
            aria-label="Next"
            onClick={() => invoke("control_media", { action: "next" })}
          >
            <SkipForward size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </main>
  );
}

export default App;
