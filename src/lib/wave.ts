export interface WaveBar {
  delay: number;
  duration: number;
}

export function generateWaveConfig(bars: number): WaveBar[] {
  return Array.from({ length: bars }, () => ({
    delay: Math.random() * 0.8,
    duration: 1 + Math.random() * 0.6,
  }));
}
