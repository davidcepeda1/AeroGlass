/** Two dominant colors pulled from an album cover, as hex strings. */
export type DominantColors = [string, string];

// Pixels this close to black/white carry no real color information (album
// art borders, letterboxing, faded corners) — counting them would make
// "dominant color" mean "background padding" instead of the actual artwork.
const MIN_LIGHTNESS = 0.08;
const MAX_LIGHTNESS = 0.92;

// Below this saturation the color reads as grayscale to the eye — not worth
// theming the equalizer around, better to fall back to the default palette.
// Kept low on purpose: a muted-but-real dominant color (steel blue, olive)
// should still win over a small vivid accent, so this only needs to catch
// actual gray/noise, not anything with a hint of real hue.
const MIN_USABLE_SATURATION = 0.08;

// How different two candidate colors must be (in HSL space) before the
// second one counts as a distinct "second dominant color" instead of just a
// slightly different shade of the first.
const MIN_COLOR_SEPARATION = 0.12;

const SAMPLE_SIZE = 48;

// Some covers have a colored frame/padding around the actual art — sampling
// only the central region avoids that border skewing the result. 6% off
// each side is enough to drop a thin frame without cropping into content.
const BORDER_MARGIN = 0.06;

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

/**
 * Single-pass 3x3 box blur. JPEG chroma-subsampling artifacts on otherwise
 * flat black/white covers can concentrate into a single-hue speckle that a
 * per-pixel histogram then reads as "the dominant color" of an image that
 * has no real color at all — smoothing that out here, before any color math
 * runs, is cheaper and more reliable than trying to filter it out after the
 * fact by raising the saturation floor (which also throws away genuinely
 * muted-but-real dominant colors).
 */
function boxBlur(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const i = (ny * width + nx) * 4;
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          a += pixels[i + 3];
          n++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = a / n;
    }
  }
  return out;
}

// --- OKLab: a perceptually-uniform color space (Björn Ottosson, 2020) ---
// Clustering in raw sRGB/HSL distorts "how different two colors actually
// look" — e.g. equal-sized steps in hue aren't equally noticeable across
// the wheel. OKLab distance tracks human perception much more closely, so
// grouping pixels by OKLab distance produces clusters that actually match
// what a person would call "the same color", instead of clusters shaped by
// a fixed grid or by hue/lightness/saturation's own quirks.
interface Oklab {
  L: number;
  a: number;
  b: number;
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const clamped = Math.max(0, Math.min(1, v));
  return Math.round(
    (clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255,
  );
}

function rgbToOklab(r: number, g: number, b: number): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb({ L, a, b }: Oklab): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

interface WeightedLabPoint extends Oklab {
  weight: number;
}

interface Cluster {
  centroid: Oklab;
  weight: number;
}

/**
 * Weighted k-means in OKLab. Small K and few iterations are enough here —
 * the input is a 48x48 sample (at most ~2300 points after filtering), not a
 * full image, so this stays cheap even run synchronously on the UI thread.
 */
function kMeansOklab(points: WeightedLabPoint[], k: number, iterations = 8): Cluster[] {
  if (points.length === 0) return [];
  const K = Math.min(k, points.length);

  const distSq = (p: Oklab, c: Oklab) =>
    (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;

  // Seed centroids with weighted farthest-point sampling (a k-means++
  // variant): start at the heaviest point, then repeatedly add whichever
  // remaining point is both far from the existing centroids *and* heavy —
  // spreads the initial guess across the real clusters instead of
  // clumping, so the fixed iteration budget below actually converges.
  const centroids: Oklab[] = [];
  let heaviest = points[0];
  for (const p of points) if (p.weight > heaviest.weight) heaviest = p;
  centroids.push({ L: heaviest.L, a: heaviest.a, b: heaviest.b });

  while (centroids.length < K) {
    let best = points[0];
    let bestScore = -Infinity;
    for (const p of points) {
      let minDist = Infinity;
      for (const c of centroids) minDist = Math.min(minDist, distSq(p, c));
      const score = minDist * p.weight;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    centroids.push({ L: best.L, a: best.a, b: best.b });
  }

  const assignments = new Array(points.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = distSq(points[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, weight: 0 }));
    for (let i = 0; i < points.length; i++) {
      const s = sums[assignments[i]];
      const p = points[i];
      s.L += p.L * p.weight;
      s.a += p.a * p.weight;
      s.b += p.b * p.weight;
      s.weight += p.weight;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].weight > 0) {
        centroids[c] = { L: sums[c].L / sums[c].weight, a: sums[c].a / sums[c].weight, b: sums[c].b / sums[c].weight };
      }
    }
  }

  const weights = centroids.map(() => 0);
  for (let i = 0; i < points.length; i++) weights[assignments[i]] += points[i].weight;

  return centroids.map((centroid, i) => ({ centroid, weight: weights[i] }));
}

const CLUSTER_COUNT = 6;

// Clusters within this many hue-units (25° out of 360°, expressed on our
// 0-1 hue scale) of each other get merged into one candidate before
// ranking — see the comment where this is used.
const HUE_MERGE_THRESHOLD = 25 / 360;

// Gaussian falloff from the sample's center — album art almost always puts
// the subject that reads as "the cover's color" in the middle, so a pixel
// there should count for more than one buried in a corner, even before
// saturation is factored in. Sigma of 0.6 (of the half-width) still leaves
// corners contributing meaningfully (~20%), just not equally.
const CENTER_WEIGHT_SIGMA = 0.6;

function centerWeight(x: number, y: number, size: number): number {
  const half = size / 2;
  const dx = (x - half) / half;
  const dy = (y - half) / half;
  return Math.exp(-(dx * dx + dy * dy) / (2 * CENTER_WEIGHT_SIGMA * CENTER_WEIGHT_SIGMA));
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

  const marginX = img.naturalWidth * BORDER_MARGIN;
  const marginY = img.naturalHeight * BORDER_MARGIN;
  ctx.drawImage(
    img,
    marginX,
    marginY,
    img.naturalWidth - marginX * 2,
    img.naturalHeight - marginY * 2,
    0,
    0,
    SAMPLE_SIZE,
    SAMPLE_SIZE,
  );

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    // Cross-origin image without CORS headers taints the canvas — reading
    // it back throws instead of returning garbage.
    return null;
  }
  pixels = boxBlur(pixels, SAMPLE_SIZE, SAMPLE_SIZE);

  // Build the point set k-means clusters on: every usable pixel's OKLab
  // position, weighted by how close it sits to the sample's center. Same
  // lightness/saturation pre-filter as before — a pixel with no real color
  // shouldn't get to anchor a cluster just because there are a lot of them.
  const points: WeightedLabPoint[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3];
    if (alpha < 200) continue;

    const { s, l } = rgbToHsl(r, g, b);
    if (l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;
    if (s < MIN_USABLE_SATURATION) continue;

    const pixelIndex = i / 4;
    const x = pixelIndex % SAMPLE_SIZE;
    const y = Math.floor(pixelIndex / SAMPLE_SIZE);

    points.push({ ...rgbToOklab(r, g, b), weight: centerWeight(x, y, SAMPLE_SIZE) });
  }

  if (points.length === 0) {
    // Nothing colorful enough survived filtering — dark, washed-out, or
    // grayscale cover. Let the caller fall back to the default palette.
    return null;
  }

  const clusters = kMeansOklab(points, CLUSTER_COUNT);

  // K-means with a handful of clusters tends to split one real color family
  // into several — a red-lit face has shadow-red and highlight-red pixels
  // that sit at very different distances from the origin in OKLab's a/b
  // plane (different chroma/lightness), so they land in separate clusters
  // even though a person calls both of them "red". Left alone, that split
  // vote lets neither fragment out-rank a single, larger, duller cluster
  // that stayed unified (a dark background, say) — merging same-hue
  // clusters back together first is what lets "red" compete as one voice.
  const rawCandidates = clusters.map((cluster) => {
    const [r, g, b] = oklabToRgb(cluster.centroid);
    return { r, g, b, hsl: rgbToHsl(r, g, b), weight: cluster.weight };
  });
  rawCandidates.sort((a, b) => b.weight - a.weight);

  const merged: typeof rawCandidates = [];
  for (const candidate of rawCandidates) {
    const target = merged.find(
      (m) => hueDistance(m.hsl.h, candidate.hsl.h) <= HUE_MERGE_THRESHOLD,
    );
    if (target) {
      const totalWeight = target.weight + candidate.weight;
      target.r = (target.r * target.weight + candidate.r * candidate.weight) / totalWeight;
      target.g = (target.g * target.weight + candidate.g * candidate.weight) / totalWeight;
      target.b = (target.b * target.weight + candidate.b * candidate.weight) / totalWeight;
      target.weight = totalWeight;
      target.hsl = rgbToHsl(target.r, target.g, target.b);
    } else {
      merged.push({ ...candidate });
    }
  }

  // Rank by "visual weight" (merged weight times saturation), not raw
  // weight — a small vivid logo or accent should be able to outrank a
  // large neutral background, the way a human eye actually picks the
  // "color" of a cover. Pure frequency counting let a stark black/white
  // background always win against a small colorful focal point.
  const ranked = merged
    .map((candidate) => ({ hsl: candidate.hsl, weight: candidate.weight * candidate.hsl.s }))
    .sort((a, b) => b.weight - a.weight);

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
