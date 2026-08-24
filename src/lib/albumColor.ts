/** Two dominant colors pulled from an album cover, as hex strings. */
export type DominantColors = [string, string];

// Pixels this close to black/white carry no real color information (album
// art borders, letterboxing, faded corners) — counting them would make
// "dominant color" mean "background padding" instead of the actual artwork.
const MIN_LIGHTNESS = 0.08;
const MAX_LIGHTNESS = 0.92;

// Below this saturation the color reads as grayscale to the eye — not worth
// theming the equalizer around, better to fall back to the default palette.
const MIN_USABLE_SATURATION = 0.15;

// How different two candidate colors must be (in HSL space) before the
// second one counts as a distinct "second dominant color" instead of just a
// slightly different shade of the first.
const MIN_COLOR_SEPARATION = 0.12;

const SAMPLE_SIZE = 48;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return { h: h / 6, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  if (s === 0) {
    const v = Math.round(l * 255);
    return rgbToHex(v, v, v);
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToRgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const r = Math.round(hueToRgb(h + 1 / 3) * 255);
  const g = Math.round(hueToRgb(h) * 255);
  const b = Math.round(hueToRgb(h - 1 / 3) * 255);
  return rgbToHex(r, g, b);
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Shortest-path distance between two hues on the color wheel, 0-0.5. */
function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1;
  return d > 0.5 ? 1 - d : d;
}

function colorDistance(a: Hsl, b: Hsl): number {
  // Weighted so a real hue difference counts more than a small lightness
  // wobble — two dark-blue pixels shouldn't register as "two colors" just
  // because one is a bit darker.
  return hueDistance(a.h, b.h) * 2 + Math.abs(a.s - b.s) + Math.abs(a.l - b.l) * 0.5;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Extracts the two most prominent, usable colors from an album cover.
 * Returns `null` when there's no image, the image can't be read (CORS-tainted
 * canvas from a cross-origin cover URL), or nothing in it is colorful enough
 * to be worth theming around — callers should fall back to a fixed palette
 * in all of those cases.
 */
export async function extractDominantColors(
  imageUrl: string | null,
): Promise<DominantColors | null> {
  if (!imageUrl) return null;

  let img: HTMLImageElement;
  try {
    img = await loadImage(imageUrl);
  } catch {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    // Cross-origin image without CORS headers taints the canvas — reading
    // it back throws instead of returning garbage.
    return null;
  }

  // Coarse histogram: quantize into a small number of buckets so near-
  // identical pixels (JPEG noise, gradients) collapse into one "color"
  // instead of each being its own singleton bucket.
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3];
    if (alpha < 200) continue;

    const { s, l } = rgbToHsl(r, g, b);
    if (l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;
    if (s < MIN_USABLE_SATURATION) continue;

    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const ranked = Array.from(buckets.values())
    .map((b) => ({
      count: b.count,
      hsl: rgbToHsl(b.r / b.count, b.g / b.count, b.b / b.count),
    }))
    .sort((a, b) => b.count - a.count);

  if (ranked.length === 0) {
    // Nothing colorful enough survived filtering — dark, washed-out, or
    // grayscale cover. Let the caller fall back to the default palette.
    return null;
  }

  const primary = ranked[0].hsl;
  const secondary =
    ranked.find((candidate) => colorDistance(candidate.hsl, primary) >= MIN_COLOR_SEPARATION)
      ?.hsl ??
    // Nothing distinct enough turned up (near-monochrome art) — shift
    // lightness so the second stop still reads as a different shade
    // instead of an identical, pointless duplicate.
    { ...primary, l: Math.min(0.85, primary.l + 0.25) };

  return [hslToHex(primary), hslToHex(secondary)];
}

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsl(r, g, b);
}

// Used when there's no usable album color (no cover, extraction failed, or
// the art was too dark/desaturated to theme around) — the same blue-through-
// green feel the equalizer always had, fed through the same ordering and
// interpolation path as real extracted colors so there's exactly one code
// path to get right, not two.
const DEFAULT_PALETTE: DominantColors = ["#2f6bff", "#3ee85a"];

const GRADIENT_STOP_COUNT = 5;

/**
 * Decides which color is the "bottom" of the equalizer gradient and which
 * is the "top". Interpolating hue along the *shorter* arc between the two
 * (rather than whichever direction the raw values happen to fall in) is
 * what keeps the transition looking intentional instead of muddy — e.g.
 * red -> yellow the short way passes through orange (60° away); the long
 * way around the wheel passes through magenta, blue and green first (300°),
 * which reads as arbitrary. Once that direction is fixed, going bottom-to-
 * top *along* it naturally increases hue the "warm" way (red -> orange ->
 * yellow), matching how a rising bar reads as more energetic.
 */
function orderForGradient(colors: DominantColors): DominantColors {
  const [a, b] = colors.map(hexToHsl) as [Hsl, Hsl];

  // Exactly opposite hues (or both desaturated enough that hue is
  // meaningless): there's no "shorter side" to prefer, so fall back to the
  // same quiet/loud metaphor used everywhere else in the equalizer — darker
  // at the bottom, lighter at the top.
  if (Math.abs(hueDistance(a.h, b.h) - 0.5) < 1e-6 || (a.s < 0.05 && b.s < 0.05)) {
    return a.l <= b.l ? colors : [colors[1], colors[0]];
  }

  const forwardDelta = ((b.h - a.h) % 1 + 1) % 1; // a -> b, increasing hue
  // If going forward from a lands on b within the shorter half of the
  // wheel, a is already the natural start of that shorter arc.
  return forwardDelta <= 0.5 ? colors : [colors[1], colors[0]];
}

/** Signed hue delta from `a` to `b` along whichever arc is shorter, so
 * lerping `a.h + t * delta` never takes the long way around the wheel. */
function shortestHueDelta(a: number, b: number): number {
  let delta = (b - a) % 1;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Builds an evenly-spaced set of hex stops (bottom to top) for the
 * equalizer's gradient, interpolating hue/saturation/lightness independently
 * so the transition stays smooth and doesn't dip through gray the way a raw
 * RGB blend between two very different hues would.
 */
function buildGradientStops(colors: DominantColors, count = GRADIENT_STOP_COUNT): string[] {
  const [bottom, top] = orderForGradient(colors).map(hexToHsl) as [Hsl, Hsl];
  const hueDelta = shortestHueDelta(bottom.h, top.h);

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const h = (bottom.h + hueDelta * t + 1) % 1;
    return hslToHex({
      h,
      s: lerp(bottom.s, top.s, t),
      l: lerp(bottom.l, top.l, t),
    });
  });
}

/** Gradient stops for the equalizer, bottom to top — from real album colors
 * when available, or the default palette otherwise. */
export function getEqualizerPalette(extracted: DominantColors | null): string[] {
  return buildGradientStops(extracted ?? DEFAULT_PALETTE);
}

// The classic bright-green peak marker — kept as the fallback so the widget
// looks exactly as it always has when there's no usable album color, same
// as the default blue/green bar gradient.
const DEFAULT_PEAK_COLOR = "#7cff8c";

/**
 * Color for the peak-hold marker: deliberately *not* one of the two bar
 * gradient colors, or a shade of them, so it still pops as a distinct
 * "peak" indicator instead of blending into the bar underneath it. Rotating
 * 180° from the gradient's midpoint hue is the point guaranteed farthest
 * from *both* endpoints (the gradient only ever spans up to 180° of the
 * wheel, so its antipode can't be close to either side), boosted in
 * saturation/lightness for the same punchy, glowing look the original
 * fixed green had.
 */
export function getPeakColor(extracted: DominantColors | null): string {
  if (!extracted) return DEFAULT_PEAK_COLOR;

  const [bottom, top] = orderForGradient(extracted).map(hexToHsl) as [Hsl, Hsl];
  const hueDelta = shortestHueDelta(bottom.h, top.h);
  const midHue = (bottom.h + hueDelta / 2 + 1) % 1;
  const peakHue = (midHue + 0.5) % 1;

  return hslToHex({
    h: peakHue,
    s: Math.max(bottom.s, top.s, 0.7),
    l: 0.68,
  });
}
