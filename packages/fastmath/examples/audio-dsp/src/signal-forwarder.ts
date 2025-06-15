import { RingBuffer, AudioReader, deinterleave } from "ringbuf.js";

export default class SignalForwarder extends AudioWorkletProcessor {
  audioReader: AudioReader;
  readBuffer: Float32Array | null;
  bufferSize: number;

  constructor(options: AudioWorkletNodeOptions) {
    super();
    this.audioReader = new AudioReader(
      new RingBuffer(options.processorOptions.sharedAudioBuffer, Float32Array),
    );
    this.readBuffer = null;
    this.bufferSize = 0;
  }

  process(
    _inputs: Array<Array<Float32Array>>,
    outputs: Array<Array<Float32Array>>,
    _parameters: Record<string, Float32Array>,
  ): boolean {
    const frameCount = outputs[0][0].length;
    const channelCount = outputs[0].length;
    const bufferSize = frameCount * channelCount;

    // allocate the read buffer if it doesn't exist or if the size has changed
    if (!this.readBuffer || this.bufferSize !== bufferSize) {
      this.bufferSize = bufferSize;
      this.readBuffer = new Float32Array(bufferSize);
    }

    if (this.audioReader.availableRead()) {
      const needed = frameCount * channelCount;
      const read = this.audioReader.dequeue(this.readBuffer);
      // handle stale data
      if (read < needed) {
        // fill the remainder with zeros
        this.readBuffer.fill(0, read);
        console.warn(`Read buffer underflow: ${read} < ${needed}`);
      }
      deinterleave(this.readBuffer, outputs[0]);
    }
    return true; // keep the processor alive
  }
}
registerProcessor("signal-forwarder", SignalForwarder);
