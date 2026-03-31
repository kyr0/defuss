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
	Label,
} from "defuss-shadcn";
import { TalkingHead } from "@met4citizen/talkinghead";
import { LipsyncEn } from "@met4citizen/talkinghead/modules/lipsync-en.mjs";

const CDN_BASE = "https://cdn.jsdelivr.net/gh/met4citizen/HeadTTS@main/avatars";
const AUDIO_URL = "/reference.wav";

const AVATARS = [
	{ id: "julia", label: "Julia (Female)", url: `${CDN_BASE}/julia.glb`, body: "F" as const },
	{ id: "david", label: "David (Male)", url: `${CDN_BASE}/david.glb`, body: "M" as const },
] as const;

type DemoState = {
	head: any | null;
	audioBuffer: AudioBuffer | null;
	initialized: boolean;
	currentAvatar: string;
};

const state: DemoState = {
	head: null,
	audioBuffer: null,
	initialized: false,
	currentAvatar: "",
};

function getSelectedAvatar() {
	const id = q<HTMLSelectElement>("demo-avatar").value;
	return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

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

async function ensureReady() {
	const avatar = getSelectedAvatar();

	// Re-init if avatar selection changed
	if (state.initialized && state.currentAvatar !== avatar.id) {
		state.initialized = false;
		state.head = null;
		q("avatar-stage").innerHTML = "";
		logLine(`Switching avatar to ${avatar.label}…`);
	}

	if (state.initialized && state.head && state.audioBuffer) return;

	setStatus("Initializing\u2026", `Loading ${avatar.label} and decoding the reference audio.`);
	logLine(`Creating TalkingHead with ${avatar.label}.`);

	const head = new TalkingHead(q("avatar-stage"), {
		cameraView: "upper",
		avatarMood: "neutral",
		lipsyncLang: "en",
		lipsyncModules: [],
		modelFPS: 60,
	});

	// Monkey-patch the English lipsync module (avoids Vite dynamic import issue)
	head.lipsync["en"] = new LipsyncEn();
	logLine("English lipsync module injected.");

	await head.showAvatar(
		{
			url: avatar.url,
			body: avatar.body,
			avatarMood: "neutral",
			lipsyncLang: "en",
			ttsLang: "en-US",
			ttsVoice: avatar.body === "M" ? "en-US-Standard-D" : "en-US-Standard-F",
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

	logLine("Fetching reference audio\u2026");
	const response = await fetch(AUDIO_URL);
	if (!response.ok) throw new Error(`Failed to fetch ${AUDIO_URL}: ${response.status}`);
	const arrayBuffer = await response.arrayBuffer();
	const audioCtx = new AudioContext();
	const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
	await audioCtx.close();
	logLine(`Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz.`);

	state.head = head;
	state.audioBuffer = audioBuffer;
	state.initialized = true;
	state.currentAvatar = avatar.id;

	setStatus("Ready", `${avatar.label} loaded. Press \u201cSpeak\u201d to play back the reference audio with lip-sync.`);
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
	try {
		await ensureReady();

		const head = state.head!;
		const audioBuffer = state.audioBuffer!;

		logLine("Playing reference audio with lip-sync\u2026");
		setStatus("Speaking\u2026", "Playing reference.wav through TalkingHead with word-level lip-sync.");

		// Build simple word timing spread across the audio duration
		const durationMs = audioBuffer.duration * 1000;
		const sampleWords = "Hello from defuss this is a talking head avatar demo with reference audio playback".split(" ");
		const wordDuration = durationMs / sampleWords.length;
		const wtimes = sampleWords.map((_, i) => i * wordDuration);
		const wdurations = sampleWords.map(() => wordDuration);

		head.speakAudio(
			{
				audio: audioBuffer,
				words: sampleWords,
				wtimes,
				wdurations,
			},
			{ lipsyncLang: "en" },
		);

		logLine("speakAudio() called. Avatar is speaking.");
		setStatus("Speaking\u2026", `Playing ${audioBuffer.duration.toFixed(1)}s of audio.`);
	} catch (error) {
		console.error(error);
		setStatus("Speak failed", String(error), "destructive");
		logLine(`Speak failed: ${String(error)}`);
	}
}

function handleStop() {
	try {
		state.head?.stopSpeaking?.();
	} catch (error) {
		console.warn(error);
	}
	setStatus("Stopped", "Playback stopped.");
	logLine("Playback stopped.");
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
							<CardTitle className="text-lg mb-2 font-bold">TalkingHead</CardTitle>
							<CardDescription>
								three.js integration demo. Plays a reference WAV file with word-level lip-sync.
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class="control-grid">
					<div id="demo-status">
						<Alert class="mt-4 border p-2 rounded-md	bg-yellow-50 text-yellow-800">
							<AlertTitle>Not initialized</AlertTitle>
							<AlertDescription class="text-sm">
								Click "Initialize" to load the 3D avatar and decode the reference audio.
							</AlertDescription>
						</Alert>
					</div>

					<div class="field-grid">
						<Label for="demo-avatar">Avatar</Label>
						<select id="demo-avatar" class="demo-select">
							{AVATARS.map((a) => (
								<option key={a.id} value={a.id}>{a.label}</option>
							))}
						</select>
					</div>

					<div class="button-row">
						<Button onClick={handleInit}>Initialize</Button>
						<Button onClick={handleSpeak}>Speak</Button>
						<Button variant="secondary" onClick={handleStop}>
							Stop
						</Button>
						<Button variant="secondary" onClick={handleResetLog}>
							Clear log
						</Button>
					</div>

					<div class="field-grid">
						<Label>Log</Label>
						<pre id="demo-log" class="demo-log" />
					</div>
				</CardContent>
			</Card>

			<Card class="demo-card">
				<CardContent>
					<div id="avatar-stage" class="avatar-stage" />
				</CardContent>
			</Card>
		</main>
	);
}
