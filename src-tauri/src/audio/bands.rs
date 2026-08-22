use rustfft::{num_complex::Complex, Fft, FftPlanner};
use std::sync::Arc;

/// Samples per FFT window. At typical audio rates (44.1-48kHz) this is
/// ~40-45ms of audio. Needs to be this large (not 1024) so the low-end
/// bands are wide enough to land in a real FFT bin at all — at 1024 the
/// bin width (~47Hz) is wider than the 20-40Hz and 40-70Hz band edges,
/// so those two bars always read exactly zero.
pub const FFT_SIZE: usize = 2048;

/// Matches the widget's graphic-equalizer bar count (see WAVE_BARS in App.tsx).
pub const BAR_COUNT: usize = 12;

/// Log-spaced band edges (music energy concentrates in the bass, so
/// linear-width bands would leave the upper bars almost always empty) —
/// close to a classic 12-band graphic EQ's center frequencies.
const BAND_EDGES_HZ: [f32; BAR_COUNT + 1] = [
    20.0, 40.0, 70.0, 120.0, 200.0, 350.0, 600.0, 1_000.0, 1_700.0, 3_000.0, 5_000.0, 9_000.0,
    16_000.0,
];

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
            // Guarantee at least one bin even if the band's frequency range
            // is narrower than a single FFT bin — otherwise that band reads
            // as permanently silent (see FFT_SIZE doc comment above).
            let hi = ((BAND_EDGES_HZ[band + 1] / self.bin_hz) as usize)
                .max(lo + 1)
                .min(buffer.len() / 2);
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
