use super::bands::{BandAnalyzer, FFT_SIZE};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use tauri::{AppHandle, Emitter};

pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        if let Err(err) = run(app) {
            eprintln!("aeroglass: audio visualizer unavailable ({err})");
        }
    });
}

/// cpal transparently enables WASAPI loopback mode when a WASAPI *output*
/// device is opened as an *input* stream — see
/// https://docs.rs/cpal/latest/cpal/ (WASAPI host docs) and
/// https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording.
/// That gives us "whatever is actually being heard", independent of which
/// app is playing it, with no extra API beyond what cpal already exposes.
fn run(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or("no default output device")?;

    let supported_config = device.default_output_config()?;
    if supported_config.sample_format() != cpal::SampleFormat::F32 {
        return Err(format!(
            "unsupported loopback sample format: {:?} (expected F32)",
            supported_config.sample_format()
        )
        .into());
    }

    let sample_rate = supported_config.sample_rate().0 as f32;
    let channels = supported_config.channels() as usize;
    let stream_config = supported_config.config();

    let mut analyzer = BandAnalyzer::new(sample_rate);
    let mut mono_buffer = Vec::<f32>::with_capacity(FFT_SIZE);

    let stream = device.build_input_stream(
        &stream_config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            for frame in data.chunks(channels) {
                let sample = frame.iter().sum::<f32>() / channels as f32;
                mono_buffer.push(sample);
                if mono_buffer.len() == FFT_SIZE {
                    let levels = analyzer.analyze(&mono_buffer);
                    let _ = app.emit("audio-levels", levels.to_vec());
                    mono_buffer.clear();
                }
            }
        },
        |err| eprintln!("aeroglass: audio stream error ({err})"),
        None,
    )?;

    stream.play()?;

    // Keep the stream (and this thread) alive for the lifetime of the app.
    loop {
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}
