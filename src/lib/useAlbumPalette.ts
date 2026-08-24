import { useEffect, useState } from "react";
import { extractDominantColors, getEqualizerPalette } from "./albumColor";

/**
 * Equalizer gradient stops (bottom to top) themed off the current album
 * cover. Starts on the default palette immediately (so there's no flash of
 * "no color" while extraction runs) and swaps in the real one once it
 * resolves — extraction is async (loads the image, samples a canvas) and
 * shouldn't block the first paint of a track change.
 */
export function useAlbumPalette(coverArt: string | null): string[] {
  const [palette, setPalette] = useState<string[]>(() => getEqualizerPalette(null));

  useEffect(() => {
    let cancelled = false;

    extractDominantColors(coverArt).then((colors) => {
      if (!cancelled) {
        setPalette(getEqualizerPalette(colors));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [coverArt]);

  return palette;
}
