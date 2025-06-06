export const defaultSystemSoundFilePaths: Array<string> = [
  "/sounds/balloon.ogg",
  "/sounds/batterycritical.ogg",
  "/sounds/batterylow.ogg",
  "/sounds/criticalstop.ogg",
  "/sounds/ding.ogg",
  "/sounds/error.ogg",
  "/sounds/exclamation.ogg",
  "/sounds/hardwarefail.ogg",
  "/sounds/hardwareinsert.ogg",
  "/sounds/logoffsound.ogg",
  "/sounds/logonsound.ogg",
  "/sounds/notify.ogg",
  "/sounds/recycle.ogg",
  "/sounds/shutdown.ogg",
  "/sounds/start.ogg",
  "/sounds/startup.ogg",
];

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioCacheBuffers: Map<string, AudioBuffer> = new Map();
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  public async init() {
    this.audioContext = new AudioContext();
    // Handle suspended state due to browser autoplay policies
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  public preload(
    url: Array<string> | string,
  ): Promise<AudioBuffer | AudioBuffer[]> {
    if (!Array.isArray(url)) {
      url = [url];
    }

    if (!this.audioContext) {
      return Promise.reject(new Error("AudioContext is not initialized"));
    }

    const loadPromises = url.map((singleUrl) => {
      // Return cached buffer if already loaded
      if (this.audioCacheBuffers.has(singleUrl)) {
        return Promise.resolve(this.audioCacheBuffers.get(singleUrl)!);
      }

      return new Promise<AudioBuffer>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", singleUrl, true);
        request.responseType = "arraybuffer";
        request.onload = () => {
          this.audioContext!.decodeAudioData(
            request.response,
            (buffer) => {
              this.audioCacheBuffers.set(singleUrl, buffer);
              resolve(buffer);
            },
            (error) =>
              reject(
                new Error(
                  `Failed to decode audio data for ${singleUrl}: ${error}`,
                ),
              ),
          );
        };
        request.onerror = () => {
          reject(new Error(`Failed to load audio file from ${singleUrl}`));
        };
        request.send();
      });
    });

    // If single URL, return single AudioBuffer; if array, return array
    return url.length === 1 ? loadPromises[0] : Promise.all(loadPromises);
  }

  public async play(
    bufferOrBufferUrl: AudioBuffer | string,
    options?: {
      volume?: number;
      loop?: boolean;
    },
  ): Promise<AudioBufferSourceNode> {
    let buffer: AudioBuffer;
    if (!this.audioContext) {
      throw new Error("AudioContext is not initialized");
    }

    // Resume context if suspended
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    if (typeof bufferOrBufferUrl === "string") {
      if (!this.audioCacheBuffers.has(bufferOrBufferUrl)) {
        await this.preload(bufferOrBufferUrl);
      }
      buffer = this.audioCacheBuffers.get(bufferOrBufferUrl)!;
      if (!buffer) {
        throw new Error(
          `Audio buffer for URL ${bufferOrBufferUrl} is not preloaded.`,
        );
      }
    } else if (bufferOrBufferUrl instanceof AudioBuffer) {
      buffer = bufferOrBufferUrl;
    } else {
      throw new Error(
        "Invalid argument: must be an AudioBuffer or a preloaded URL string.",
      );
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Fix: Only connect through gain node OR directly, not both
    if (options?.volume !== undefined) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = options.volume;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
    } else {
      source.connect(this.audioContext.destination);
    }

    if (options?.loop) {
      source.loop = true;
    }

    // Track active sources for cleanup
    this.activeSources.add(source);

    source.onended = () => {
      source.disconnect();
      this.activeSources.delete(source);
    };

    source.start(0);
    return source;
  }

  public stopAllSounds(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might already be stopped
      }
    });
    this.activeSources.clear();
  }

  public clearCache(): void {
    this.audioCacheBuffers.clear();
  }
}

// Ensure singleton of SoundManager module-wide
globalThis.__defussSoundManager =
  globalThis.__defussSoundManager || new SoundManager();

export const soundManager = globalThis.__defussSoundManager;
