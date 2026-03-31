import { $ } from "defuss";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
} from "defuss-shadcn";
import { TalkingHead } from "@met4citizen/talkinghead";
import { HeadTTS } from "@met4citizen/headtts";

const AVATAR_URL = "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7.0/avatars/brunette.glb";
const HEADTTS_VERSION = "1.2.0";
const HEADTTS_WORKER = `https://cdn.jsdelivr.net/npm/@met4citizen/headtts@${HEADTTS_VERSION}/modules/worker-tts.mjs`;
const HEADTTS_DICTIONARIES = `https://cdn.jsdelivr.net/npm/@met4citizen/headtts@${HEADTTS_VERSION}/dictionaries/`;
const HEADTTS_DEFAULT_SAMPLE_RATE = 24000;

const DEFAULT_TEXT =
  "Hello from defuss. This demo streams raw PCM from HeadTTS into TalkingHead and applies the returned viseme timeline in real time.";

const VOICES = [
  "af_bella",
  "af_sarah",
  "am_fenrir",
  "am_michael",
] as const;

type DemoState = {
  head: any | null;
  headtts: any | null;
  initialized: boolean;
  streamToken: number;
  chunkCount: number;
  active: boolean;
};

const state: DemoState = {
  head: null,
  headtts: null,
  initialized: false,
  streamToken: 0,
  chunkCount: 0,
  active: false,
};

function q<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing DOM node #${id}`);
  }
  return node as T;
}

function logLine(line: string) {
  const log = q<HTMLPreElement>("demo-log");
  const timestamp = new Date().toLocaleTimeString();
  const next = `${timestamp}  ${line}`;
  log.textContent = log.textContent ? `${next}\n${log.textContent}` : next;
}

function setStatus(title: string, description: string, variant: "default" | "destructive" = "default") {
  $(q("demo-status")).update(
    <Alert variant={variant === "destructive" ? "destructive" : undefined}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>,
  );
}

function setSubtitles(text: string) {
  const node = q<HTMLDivElement>("demo-subtitles");
  node.textContent = text;
}

function getText() {
  return q<HTMLTextAreaElement>("demo-text").value.trim();
}

function getVoice() {
  return q<HTMLSelectElement>("demo-voice").value;
}

function getSpeed() {
  const value = Number(q<HTMLInputElement>("demo-speed").value);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function bufferFromUnknownAudio(audio: unknown): ArrayBuffer {
  if (audio instanceof ArrayBuffer) return audio;
  if (ArrayBuffer.isView(audio)) {
    return audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength);
  }
  if (typeof audio === "string") {
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  throw new Error("HeadTTS audio payload is not an ArrayBuffer, typed array, or base64 string.");
}

async function ensureReady() {
  if (state.initialized && state.head && state.headtts) return;

  setStatus("Initializing…", "Loading the avatar, 3D scene, and HeadTTS backends.");
  logLine("Creating TalkingHead instance.");

  const head = new TalkingHead(q("avatar-stage"), {
    cameraView: "upper",
    avatarMood: "neutral",
    lipsyncLang: "en",
    lipsyncModules: [],
    modelFPS: 60,
  });

  await head.showAvatar(
    {
      url: AVATAR_URL,
      body: "F",
      avatarMood: "neutral",
      lipsyncLang: "en",
      ttsLang: "en-US",
      ttsVoice: "en-US-Standard-F",
      baseline: {
        headRotateX: -0.05,
        eyeBlinkLeft: 0.15,
        eyeBlinkRight: 0.15,
      },
    },
    () => {
      logLine("Avatar asset loaded.");
    },
  );

  logLine("Creating HeadTTS client.");
  const headtts = new HeadTTS({
    endpoints: ["webgpu", "wasm"],
    languages: ["en-us"],
    voices: [getVoice()],
    workerModule: HEADTTS_WORKER,
    dictionaryURL: HEADTTS_DICTIONARIES,
    audioSampleRate: HEADTTS_DEFAULT_SAMPLE_RATE,
  });

  headtts.onerror = (error: unknown) => {
    console.error(error);
    setStatus("HeadTTS error", String(error), "destructive");
    logLine(`HeadTTS error: ${String(error)}`);
  };

  await headtts.connect();
  logLine("HeadTTS connected.");

  state.head = head;
  state.headtts = headtts;
  state.initialized = true;

  setStatus(
    "Ready",
    "Avatar initialized. Press “Speak” to stream PCM chunks and viseme timing into TalkingHead.",
  );

  toast({
    title: "Demo ready",
    description: "TalkingHead and HeadTTS are initialized.",
  });
}

async function handleInit() {
  try {
    await ensureReady();
  } catch (error) {
    console.error(error);
    setStatus("Initialization failed", String(error), "destructive");
    logLine(`Initialization failed: ${String(error)}`);
  }
}

async function handleSpeak() {
  const input = getText();
  if (!input) {
    setStatus("Missing text", "Enter some text before starting synthesis.", "destructive");
    return;
  }

  try {
    await ensureReady();

    const head = state.head!;
    const headtts = state.headtts!;
    const token = ++state.streamToken;

    state.chunkCount = 0;
    state.active = true;

    setSubtitles("");
    logLine(`Starting stream using voice=${getVoice()} speed=${getSpeed().toFixed(2)}.`);

    try {
      head.streamInterrupt?.();
    } catch {
      // Ignore stale stream interruption errors.
    }

    await head.streamStart(
      {
        sampleRate: HEADTTS_DEFAULT_SAMPLE_RATE,
        gain: 1,
        lipsyncLang: "en",
        lipsyncType: "visemes",
        waitForAudioChunks: true,
      },
      () => {
        logLine("Avatar audio playback started.");
      },
      () => {
        logLine("Avatar audio playback ended.");
      },
      (subtitle: string) => {
        if (token !== state.streamToken) return;
        setSubtitles(subtitle);
      },
    );

    headtts.onmessage = (message: any) => {
      if (token !== state.streamToken) return;

      if (message.type === "audio") {
        const audioBuffer = bufferFromUnknownAudio(message.data?.audio);

        state.chunkCount += 1;
        logLine(
          `Chunk ${state.chunkCount}: ${audioBuffer.byteLength} bytes, ${message.data?.visemes?.length ?? 0} visemes.`,
        );

        head.streamAudio({
          audio: audioBuffer,
          visemes: message.data?.visemes,
          vtimes: message.data?.vtimes,
          vdurations: message.data?.vdurations,
        });
      } else if (message.type === "error") {
        console.error(message.data);
        setStatus("Synthesis failed", String(message.data?.error ?? "Unknown synthesis error."), "destructive");
        logLine(`Synthesis failed: ${String(message.data?.error ?? "Unknown synthesis error.")}`);
      }
    };

    headtts.onend = () => {
      if (token !== state.streamToken) return;
      state.active = false;
      head.streamNotifyEnd();
      setStatus(
        "Done",
        `Finished streaming ${state.chunkCount} audio chunk${state.chunkCount === 1 ? "" : "s"}.`,
      );
      logLine("HeadTTS queue drained. streamNotifyEnd() sent.");
    };

    headtts.setup({
      voice: getVoice(),
      language: "en-us",
      speed: getSpeed(),
      audioEncoding: "pcm",
    });

    setStatus("Streaming…", "HeadTTS is synthesizing PCM chunks and TalkingHead is consuming them.");
    await headtts.synthesize({ input });
  } catch (error) {
    console.error(error);
    state.active = false;
    setStatus("Speak failed", String(error), "destructive");
    logLine(`Speak failed: ${String(error)}`);
  }
}

function handleInterrupt() {
  state.streamToken += 1;
  state.active = false;
  setSubtitles("");

  try {
    state.head?.streamInterrupt?.();
  } catch (error) {
    console.warn(error);
  }

  setStatus("Interrupted", "The current avatar stream was interrupted locally.");
  logLine("Stream interrupted.");
}

function handleResetLog() {
  q<HTMLPreElement>("demo-log").textContent = "";
}

export function AvatarDemoScreen() {
  return (
    <main class="demo-shell">
      <Card class="demo-card">
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <div>
              <CardTitle>TalkingHead × HeadTTS</CardTitle>
              <CardDescription>
                defuss DOM-first demo. No VDOM assumptions. PCM stream + viseme timing.
              </CardDescription>
            </div>
            <span class="pill">defuss-shadcn</span>
          </div>
        </CardHeader>
        <CardContent class="control-grid">
          <div id="demo-status">
            <Alert>
              <AlertTitle>Not initialized</AlertTitle>
              <AlertDescription>
                Click “Initialize” once. The first run loads the avatar asset and the HeadTTS model backend.
              </AlertDescription>
            </Alert>
          </div>

          <div class="field-grid">
            <Label for="demo-text">Text</Label>
            <textarea id="demo-text" class="demo-textarea">{DEFAULT_TEXT}</textarea>
          </div>

          <div class="kv-grid">
            <div class="field-grid">
              <Label for="demo-voice">Voice</Label>
              <select id="demo-voice" class="demo-select">
                {VOICES.map((voice) => (
                  <option value={voice}>{voice}</option>
                ))}
              </select>
            </div>

            <div class="field-grid">
              <Label for="demo-speed">Speed</Label>
              <Input id="demo-speed" type="number" step="0.1" min="0.25" max="4" value="1" />
            </div>
          </div>

          <div class="button-row">
            <Button onClick={handleInit}>Initialize</Button>
            <Button onClick={handleSpeak}>Speak (PCM stream)</Button>
            <Button variant="secondary" onClick={handleInterrupt}>
              Interrupt
            </Button>
            <Button variant="secondary" onClick={handleResetLog}>
              Clear log
            </Button>
          </div>

          <p class="muted-note">
            This demo uses HeadTTS in browser mode with explicit CDN worker/dictionary URLs so it works cleanly inside
            the Astro + defuss app without assuming React-style asset wiring.
          </p>

          <div class="field-grid">
            <Label>Subtitles</Label>
            <div id="demo-subtitles" class="demo-log" />
          </div>

          <div class="field-grid">
            <Label>Log</Label>
            <pre id="demo-log" class="demo-log" />
          </div>
        </CardContent>
      </Card>

      <Card class="demo-card">
        <CardHeader>
          <CardTitle>Avatar viewport</CardTitle>
          <CardDescription>
            Swap the avatar URL for your own Mixamo-compatible GLB with ARKit + Oculus viseme blendshapes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="avatar-stage" class="avatar-stage" />
        </CardContent>
      </Card>
    </main>
  );
}
