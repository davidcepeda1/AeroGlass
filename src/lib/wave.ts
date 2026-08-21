export interface WaveBar {
  peak: number;
  delay: number;
  duration: number;
}

export function generateWaveConfig(bars: number): WaveBar[] {
  return Array.from({ length: bars }, () => ({
    peak: 35 + Math.random() * 65,
    delay: Math.random() * 0.6,
    duration: 0.55 + Math.random() * 0.45,
  }));
}
