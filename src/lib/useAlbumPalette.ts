import { useEffect, useState } from "react";
import { extractDominantColors, getEqualizerPalette, getPeakColor } from "./albumColor";

export interface AlbumPalette {
  /** Bar gradient stops, bottom to top. */
  stops: string[];
  /** Peak-hold marker color — deliberately distinct from the stops above. */
  peakColor: string;
}

function defaultPalette(): AlbumPalette {
  return { stops: getEqualizerPalette(null), peakColor: getPeakColor(null) };
}

/**
 * Equalizer coloring themed off the current album cover. Starts on the
 * default palette immediately (so there's no flash of "no color" while
 * extraction runs) and swaps in the real one once it resolves — extraction
 * is async (loads the image, samples a canvas) and shouldn't block the
 * first paint of a track change.
 */
export function useAlbumPalette(coverArt: string | null): AlbumPalette {
  const [palette, setPalette] = useState<AlbumPalette>(defaultPalette);

  useEffect(() => {
    let cancelled = false;

    extractDominantColors(coverArt).then((colors) => {
      if (!cancelled) {
        setPalette({ stops: getEqualizerPalette(colors), peakColor: getPeakColor(colors) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [coverArt]);

  return palette;
}
