use super::bands::{BandAnalyzer, BAR_COUNT, FFT_SIZE};
use libpulse_binding::sample::{Format, Spec};
use libpulse_binding::stream::Direction;
use libpulse_simple_binding::Simple;
use tauri::{AppHandle, Emitter};

const CHANNELS: u8 = 2;
const SAMPLE_RATE: u32 = 48_000;

pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        if let Err(err) = run(app) {
            eprintln!("aeroglass: audio visualizer unavailable ({err})");
        }
    });
}

/// PulseAudio/PipeWire expose a `<sink>.monitor` source for every output
/// sink — that's "whatever is actually being heard", independent of which
/// app is playing it. Shelling out to `pactl` avoids pulling in the full
/// async libpulse Context API just to look up one name.
fn default_monitor_source() -> Option<String> {
    let output = std::process::Command::new("pactl")
        .arg("get-default-sink")
        .output()
        .ok()?;
    let sink = String::from_utf8(output.stdout).ok()?.trim().to_string();
    (!sink.is_empty()).then(|| format!("{sink}.monitor"))
}

fn run(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let source =
        default_monitor_source().ok_or("could not determine the default sink's monitor source")?;

    let spec = Spec {
        format: Format::FLOAT32NE,
        channels: CHANNELS,
        rate: SAMPLE_RATE,
    };

    let stream = Simple::new(
        None,
        "AeroGlass",
        Direction::Record,
        Some(&source),
        "system audio visualizer",
        &spec,
        None,
        None,
    )?;

    let mut analyzer = BandAnalyzer::new(SAMPLE_RATE as f32);
    let mut raw = vec![0u8; FFT_SIZE * CHANNELS as usize * 4];
    let mut mono = vec![0.0f32; FFT_SIZE];

    loop {
        stream.read(&mut raw)?;

        for i in 0..FFT_SIZE {
            let l = f32::from_ne_bytes(raw[i * 8..i * 8 + 4].try_into().unwrap());
            let r = f32::from_ne_bytes(raw[i * 8 + 4..i * 8 + 8].try_into().unwrap());
            mono[i] = (l + r) * 0.5;
        }

        let levels: [f32; BAR_COUNT] = analyzer.analyze(&mono);
        let _ = app.emit("audio-levels", levels.to_vec());
    }
}
