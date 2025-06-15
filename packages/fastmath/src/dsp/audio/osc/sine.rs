use rayon::prelude::*;
use std::f32::consts::PI;

pub fn sine(
  buffer: &mut Vec<f32>,      // mutable buffer for writing output
  frequency: f32,             // frequency in Hz
  amplitude: f32,             // amplitude (0.0 to 1.0)
  sample_rate: f32,           // sample rate in Hz
  num_samples: usize,         // number of samples (per channel)
  current_frame: u64,         // frame offset
) {
  // precompute constants
  let angular_frequency = frequency * 2.0 * PI;
  let sample_time_factor = 1.0 / sample_rate;

  // assume the buffer is preallocated; we don't resize here.
  assert_eq!(buffer.len(), num_samples * 2, "Buffer size is incorrect");

  // process chunks in parallel
  buffer
  .par_chunks_mut(2) // each chunk represents one stereo frame
  .enumerate()
  .for_each(|(frame, chunk)| {
    // calculate the sample time and phase
    let sample_time = (current_frame + frame as u64) as f32 * sample_time_factor;
    let phase = angular_frequency * sample_time;
    let value = phase.sin() * amplitude;

    // interleave stereo
    chunk[0] = value; // left channel
    chunk[1] = value; // right channel
  });
}