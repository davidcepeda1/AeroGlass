use rustfft::{num_complex::Complex, Fft, FftPlanner};
use std::sync::Arc;

/// Samples per FFT window. At typical audio rates (44.1-48kHz) this is
/// ~20-23ms of audio — responsive enough to feel live, long enough for
/// usable low-frequency resolution.
pub const FFT_SIZE: usize = 1024;

/// Matches the widget's current bar count (see WAVE_BARS in App.tsx).
pub const BAR_COUNT: usize = 4;

/// Roughly log-spaced band edges: music energy concentrates in the bass,
/// so linear-width bands would leave the upper bars almost always empty.
const BAND_EDGES_HZ: [f32; BAR_COUNT + 1] = [20.0, 250.0, 2_000.0, 8_000.0, 16_000.0];

/// Turns a rolling window of mono PCM samples into per-band energy levels
/// in the 0.0-1.0 range, auto-normalized against a slowly-decaying peak so
/// both quiet and loud tracks fill the same visual range.
pub struct BandAnalyzer {
    fft: Arc<dyn Fft<f32>>,
    window: Vec<f32>,
    bin_hz: f32,
    peaks: [f32; BAR_COUNT],
}

impl BandAnalyzer {
    pub fn new(sample_rate: f32) -> Self {
        let fft = FftPlanner::new().plan_fft_forward(FFT_SIZE);

        // Hann window: tapers the block's edges so the FFT doesn't read a
        // hard cut as spurious high-frequency energy (spectral leakage).
        let window: Vec<f32> = (0..FFT_SIZE)
            .map(|i| {
                0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / (FFT_SIZE as f32 - 1.0)).cos()
            })
            .collect();

        BandAnalyzer {
            fft,
            window,
            bin_hz: sample_rate / FFT_SIZE as f32,
            // Small non-zero floor so a silent room doesn't divide near-zero
            // energy into visual noise.
            peaks: [0.02; BAR_COUNT],
        }
    }

    /// `mono_samples` must be exactly `FFT_SIZE` long.
    pub fn analyze(&mut self, mono_samples: &[f32]) -> [f32; BAR_COUNT] {
        let mut buffer: Vec<Complex<f32>> = mono_samples
            .iter()
            .zip(&self.window)
            .map(|(s, w)| Complex::new(s * w, 0.0))
            .collect();
        self.fft.process(&mut buffer);

        let mut levels = [0.0f32; BAR_COUNT];
        for band in 0..BAR_COUNT {
            let lo = ((BAND_EDGES_HZ[band] / self.bin_hz) as usize).max(1);
            let hi = ((BAND_EDGES_HZ[band + 1] / self.bin_hz) as usize).min(buffer.len() / 2);
            if hi <= lo {
                continue;
            }
            levels[band] =
                buffer[lo..hi].iter().map(|c| c.norm()).sum::<f32>() / (hi - lo) as f32;
        }

        for band in 0..BAR_COUNT {
            self.peaks[band] = (self.peaks[band] * 0.995).max(levels[band]);
            levels[band] = (levels[band] / self.peaks[band]).clamp(0.0, 1.0);
        }

        levels
    }
}
