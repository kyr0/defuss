import { $ } from "defuss";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
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
import {
	FIRERED_AUDIO_REQUIREMENTS,
	VOICE_DETECTOR_DEFAULTS as FIRERED_DEFAULTS,
} from "defuss-vad/firered-web";
import * as fireredWeb from "defuss-vad/firered-web";
import {
	SILERO_AUDIO_REQUIREMENTS,
	VOICE_DETECTOR_DEFAULTS as SILERO_DEFAULTS,
} from "defuss-vad/silero-web";
import * as sileroWeb from "defuss-vad/silero-web";
import { VOICE_DETECTOR_DEFAULTS as TENVAD_DEFAULTS } from "defuss-vad/tenvad-web";
import * as tenVadWeb from "defuss-vad/tenvad-web";
import type {
	VAD,
	VADResult,
	VoiceDetector,
	VoiceDetectorResult,
} from "defuss-vad/types";
import { resampleLinear } from "defuss-vad/wav";

const CDN_BASE = "https://cdn.jsdelivr.net/gh/met4citizen/HeadTTS@main/avatars";
const AUDIO_URL = "/reference.wav";
const TARGET_SAMPLE_RATE = 16000;
const MAX_MIC_FRAME_BACKLOG = 64;

type VADBackendId = "tenvad" | "firered" | "silero";
type VoiceSegment = { startMs: number; endMs: number };

type BackendDescriptor = {
	id: VADBackendId;
	label: string;
	description: string;
	hopSize: number;
	defaultThreshold: number;
	defaultRmsFloor: number;
	createVAD: () => Promise<VAD>;
	createVoiceDetector: () => Promise<VoiceDetector>;
};

type DemoState = {
	head: any | null;
	audioBuffer: AudioBuffer | null;
	initialized: boolean;
	currentAvatar: string;
	currentBackend: VADBackendId;
	vad: VAD | null;
	detector: VoiceDetector | null;
	voiceSegments: VoiceSegment[];
};

type MicState = {
	stream: MediaStream | null;
	audioCtx: AudioContext | null;
	processor: ScriptProcessorNode | null;
	source: MediaStreamAudioSourceNode | null;
	active: boolean;
	frameQueue: Int16Array[];
	drainPromise: Promise<void> | null;
	residual: Float32Array;
};

type MeterState = {
	inputLevel: number;
	voiceLevel: number;
	noiseLevel: number;
	probability: number;
	rawVoice: boolean;
	stableVoice: boolean;
	backendLabel: string;
	backendDescription: string;
	hopSize: number;
	frameMs: number;
	version: string;
	listening: boolean;
};

const AVATARS = [
	{ id: "david", label: "David (Male)", url: `${CDN_BASE}/david.glb`, body: "M" as const },
	{ id: "julia", label: "Julia (Female)", url: `${CDN_BASE}/julia.glb`, body: "F" as const },

] as const;

const BACKENDS: readonly BackendDescriptor[] = [
	{
		id: "tenvad",
		label: "TEN-VAD",
		description: "Vendored WASM backend with fast 16 ms frames.",
		hopSize: 256,
		defaultThreshold: TENVAD_DEFAULTS.threshold,
		defaultRmsFloor: TENVAD_DEFAULTS.rmsFloor,
		createVAD: () => tenVadWeb.createVAD({ hopSize: 256, threshold: 0.5 }),
		createVoiceDetector: () => tenVadWeb.createVoiceDetector(),
	},
	{
		id: "firered",
		label: "FireRed",
		description: "Streaming ONNX backend with shorter 10 ms frames and stronger robustness.",
		hopSize: FIRERED_AUDIO_REQUIREMENTS.hopSize,
		defaultThreshold: FIRERED_DEFAULTS.threshold,
		defaultRmsFloor: FIRERED_DEFAULTS.rmsFloor,
		createVAD: () => fireredWeb.createVAD(),
		createVoiceDetector: () => fireredWeb.createVoiceDetector(),
	},
	{
		id: "silero",
		label: "Silero",
		description: "ONNX backend with a larger context window tuned for speech activity.",
		hopSize: SILERO_AUDIO_REQUIREMENTS.frameSizes[16000],
		defaultThreshold: SILERO_DEFAULTS.threshold,
		defaultRmsFloor: SILERO_DEFAULTS.rmsFloor,
		createVAD: () => sileroWeb.createVAD({ sampleRate: 16000 }),
		createVoiceDetector: () => sileroWeb.createVoiceDetector({ sampleRate: 16000 }),
	},
] as const;

const state: DemoState = {
	head: null,
	audioBuffer: null,
	initialized: false,
	currentAvatar: "",
	currentBackend: "tenvad",
	vad: null,
	detector: null,
	voiceSegments: [],
};

const mic: MicState = {
	stream: null,
	audioCtx: null,
	processor: null,
	source: null,
	active: false,
	frameQueue: [],
	drainPromise: null,
	residual: new Float32Array(0),
};

const meterState: MeterState = {
	inputLevel: 0,
	voiceLevel: 0,
	noiseLevel: 0,
	probability: 0,
	rawVoice: false,
	stableVoice: false,
	backendLabel: BACKENDS[0]!.label,
	backendDescription: BACKENDS[0]!.description,
	hopSize: BACKENDS[0]!.hopSize,
	frameMs: (BACKENDS[0]!.hopSize / TARGET_SAMPLE_RATE) * 1000,
	version: "not loaded",
	listening: false,
};

let mouthMesh: any = null;
let mouthTargets: Record<string, number> = {};
let targetMouthValue = 0;
let currentMouthValue = 0;
const MOUTH_LERP = 0.35;

// Startup modal - browsers require user gesture for AudioContext
async function handleStart() {
	// Remove the overlay
	const overlay = document.getElementById("demo-startup-overlay");
	if (overlay) {
		overlay.remove();
	}

	// Resume or create AudioContext to satisfy browser autoplay policy
	const ctx = new AudioContext();
	if (ctx.state === "suspended") {
		await ctx.resume();
	}
	await ctx.close();

	logLine("AudioContext initialized. Starting app...");

	// Now initialize the avatar and audio
	await handleInit();
}

function getSelectedAvatar() {
	const id = q<HTMLSelectElement>("demo-avatar").value;
	return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}

function getSelectedBackendId(): VADBackendId {
	return q<HTMLSelectElement>("demo-backend").value as VADBackendId;
}

function getSelectedBackend(): BackendDescriptor {
	const id = getSelectedBackendId();
	return BACKENDS.find((backend) => backend.id === id) ?? BACKENDS[0]!;
}

function q<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) {
		throw new Error(`Missing DOM node #${id}`);
	}
	return node as T;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function formatPercent(value: number): string {
	return `${Math.round(clamp01(value) * 100)}%`;
}

function logLine(line: string) {
	const log = q<HTMLPreElement>("demo-log");
	const timestamp = new Date().toLocaleTimeString();
	const next = `${timestamp}  ${line}`;
	log.textContent = log.textContent ? `${next}\n${log.textContent}` : next;
}

function setStatus(
	title: string,
	description: string,
	variant: "default" | "destructive" | "warning" = "default",
) {
	$(q("demo-status")).update(
		<Alert variant={variant !== "default" ? variant : undefined}>
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{description}</AlertDescription>
		</Alert>,
	);
}

function renderMeterRow(
	id: string,
	label: string,
	value: number,
	tone: "input" | "voice" | "noise",
) {
	return (
		<div key={id} class={`meter-row meter-${tone}`}>
			<div class="meter-meta">
				<span>{label}</span>
				<span>{formatPercent(value)}</span>
			</div>
			<div class="meter-track">
				<div class="meter-fill" style={`width: ${clamp01(value) * 100}%`} />
			</div>
		</div>
	);
}

function renderMetersMarkup() {
	const confidenceText = `${Math.round(meterState.probability * 100)}% confidence`;
	const activityLabel = meterState.listening
		? meterState.stableVoice
			? "Voice"
			: meterState.rawVoice
				? "Transient"
				: "Noise / Other"
		: "Idle";

	return (
		<div class="meter-panel">
			<div class="meter-summary">
				<div>
					<p class="meter-eyebrow">Realtime input analysis</p>
					<div class="meter-heading-row">
						<strong>{meterState.backendLabel}</strong>
						<Badge variant={meterState.stableVoice ? undefined : meterState.rawVoice ? "outline" : "secondary"}>
							{activityLabel}
						</Badge>
					</div>
					<p class="muted-note">{meterState.backendDescription}</p>
				</div>
				<div class="meter-facts">
					<span class="pill">{meterState.hopSize} samples</span>
					<span class="pill">{meterState.frameMs.toFixed(1)} ms</span>
					<span class="pill">{confidenceText}</span>
				</div>
			</div>

			<div class="meter-stack">
				{renderMeterRow("input", "Input level", meterState.inputLevel, "input")}
				{renderMeterRow("voice", "Detected voice", meterState.voiceLevel, "voice")}
				{renderMeterRow("noise", "Noise / other", meterState.noiseLevel, "noise")}
			</div>

			<div class="meter-footer muted-note">
				<div>Version: {meterState.version}</div>
				<div>
					{meterState.listening
						? "Live microphone stream active."
						: "Start Live-Test to stream the mic into the selected backend."}
				</div>
			</div>
		</div>
	);
}

function renderMeters(): void {
	const container = document.getElementById("demo-meters");
	if (!container) return;
	$(container).update(renderMetersMarkup());
}

function resetMeters(backend = BACKENDS[0]!): void {
	meterState.inputLevel = 0;
	meterState.voiceLevel = 0;
	meterState.noiseLevel = 0;
	meterState.probability = 0;
	meterState.rawVoice = false;
	meterState.stableVoice = false;
	meterState.backendLabel = backend.label;
	meterState.backendDescription = backend.description;
	meterState.hopSize = backend.hopSize;
	meterState.frameMs = (backend.hopSize / TARGET_SAMPLE_RATE) * 1000;
	meterState.version = "not loaded";
	meterState.listening = false;
	renderMeters();
}

function updateMeters(result: VoiceDetectorResult): void {
	const inputLevel = clamp01(result.rms * 8);
	meterState.inputLevel = inputLevel;
	meterState.voiceLevel = result.isVoiceStable ? inputLevel : 0;
	meterState.noiseLevel = result.isVoiceStable ? 0 : inputLevel;
	meterState.probability = clamp01(result.probability);
	meterState.rawVoice = result.isVoice;
	meterState.stableVoice = result.isVoiceStable;
	renderMeters();
}

async function destroyVADState(): Promise<void> {
	if (state.detector) {
		await state.detector.destroy();
		state.detector = null;
	}

	if (state.vad) {
		await state.vad.destroy();
		state.vad = null;
	}

	state.voiceSegments = [];
}

async function ensureReady() {
	const avatar = getSelectedAvatar();

	if (state.initialized && state.currentAvatar !== avatar.id) {
		state.initialized = false;
		state.head = null;
		q("avatar-stage").innerHTML = "";
		setStatus("Switching avatar...", `Loading ${avatar.label}. Please wait.`, "warning");
		logLine(`Switching avatar to ${avatar.label}...`);
	}

	if (state.initialized && state.head && state.audioBuffer) {
		return;
	}

	setStatus("Initializing...", `Loading ${avatar.label} and decoding the reference audio.`);
	logLine(`Creating TalkingHead with ${avatar.label}.`);

	const head = new TalkingHead(q("avatar-stage"), {
		cameraView: "upper",
		avatarMood: "neutral",
		lipsyncLang: "en",
		lipsyncModules: [],
		modelFPS: 60,
		cameraRotateX: 0.1,
		postureChangePerSec: 0,
		bodyMoveFactor: 0,
	});

	head.lipsync.en = new LipsyncEn();
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
				headRotateX: -0.02,
				spineRotateX: -0.05,
				chestRotateX: -0.03,
				eyeBlinkLeft: 0.15,
				eyeBlinkRight: 0.15,
				eyeLookInLeft: 0.1,
				eyeLookInRight: 0.1,
				eyeLookDownLeft: 0.05,
				eyeLookDownRight: 0.05,
			},
		},
		() => {
			logLine("Avatar asset loaded.");
		},
	);

	logLine("Fetching reference audio...");
	const response = await fetch(AUDIO_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${AUDIO_URL}: ${response.status}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	const audioCtx = new AudioContext();
	const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
	await audioCtx.close();
	logLine(`Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz.`);

	state.head = head;
	state.audioBuffer = audioBuffer;
	state.initialized = true;
	state.currentAvatar = avatar.id;

	setStatus("Ready", `${avatar.label} loaded. Press "Speak" to play the reference audio with lip-sync.`);
}

async function runVADAnalysis() {
	if (!state.audioBuffer) {
		logLine("No audio loaded - initialize first.");
		return;
	}

	const backend = getSelectedBackend();
	setStatus("Running VAD...", `Analysing reference audio with ${backend.label}.`);
	logLine(`Initializing ${backend.label} for offline VAD analysis...`);

	if (state.currentBackend !== backend.id) {
		await destroyVADState();
		state.currentBackend = backend.id;
	}

	if (!state.vad) {
		state.vad = await backend.createVAD();
		meterState.version = await state.vad.getVersion();
		logLine(`${backend.label} VAD created. Version: ${meterState.version}`);
	}

	meterState.backendLabel = backend.label;
	meterState.backendDescription = backend.description;
	meterState.hopSize = backend.hopSize;
	meterState.frameMs = (backend.hopSize / TARGET_SAMPLE_RATE) * 1000;
	renderMeters();

	const audioBuffer = state.audioBuffer;
	const channelData = audioBuffer.getChannelData(0);
	const sampleRate = audioBuffer.sampleRate;
	const int16 = new Int16Array(channelData.length);

	for (let index = 0; index < channelData.length; index++) {
		const sample = Math.max(-1, Math.min(1, channelData[index]!));
		int16[index] = sample < 0 ? sample * 32768 : sample * 32767;
	}

	const samples = sampleRate !== TARGET_SAMPLE_RATE
		? resampleLinear(int16, sampleRate, TARGET_SAMPLE_RATE)
		: int16;
	logLine(`VAD input: ${samples.length} samples at ${TARGET_SAMPLE_RATE / 1000}kHz (${(samples.length / TARGET_SAMPLE_RATE).toFixed(2)}s).`);

	const hopSize = backend.hopSize;
	const frameCount = Math.floor(samples.length / hopSize);
	const frameDurationMs = (hopSize / TARGET_SAMPLE_RATE) * 1000;

	let voiceFrames = 0;
	const segments: VoiceSegment[] = [];
	let segStart = -1;

	for (let index = 0; index < frameCount; index++) {
		const frame = samples.slice(index * hopSize, (index + 1) * hopSize);
		const result: VADResult = await state.vad.process(frame);

		if (result.isVoice) {
			voiceFrames++;
			if (segStart < 0) {
				segStart = index;
			}
		} else if (segStart >= 0) {
			segments.push({
				startMs: segStart * frameDurationMs,
				endMs: index * frameDurationMs,
			});
			segStart = -1;
		}
	}

	if (segStart >= 0) {
		segments.push({
			startMs: segStart * frameDurationMs,
			endMs: frameCount * frameDurationMs,
		});
	}

	state.voiceSegments = segments;

	const voicePct = frameCount > 0 ? ((voiceFrames / frameCount) * 100).toFixed(1) : "0.0";
	logLine(`${backend.label} VAD complete: ${voiceFrames}/${frameCount} voice frames (${voicePct}%).`);
	logLine(`Detected ${segments.length} voice segment(s):`);
	for (const seg of segments) {
		logLine(`  ${(seg.startMs / 1000).toFixed(2)}s - ${(seg.endMs / 1000).toFixed(2)}s (${(seg.endMs - seg.startMs).toFixed(0)}ms)`);
	}

	setStatus(
		"VAD complete",
		`${backend.label}: ${segments.length} voice segment(s) found, ${voicePct}% voice. Press "Speak" to play with VAD-guided lip-sync.`,
	);
}

function findMouthMesh(head: any) {
	if (mouthMesh) return;
	const root = head.avatar ?? head.model;
	if (!root?.traverse) return;

	root.traverse((obj: any) => {
		if (mouthMesh) return;
		if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
			if ("jawOpen" in obj.morphTargetDictionary || "mouthOpen" in obj.morphTargetDictionary) {
				mouthMesh = obj;
				mouthTargets = obj.morphTargetDictionary;
			}
		}
	});
}

function applyMouthMorph(value: number) {
	if (!mouthMesh) return;
	const jawIdx = mouthTargets.jawOpen;
	if (jawIdx !== undefined) {
		mouthMesh.morphTargetInfluences[jawIdx] = value * 0.7;
	}
	const mouthIdx = mouthTargets.mouthOpen;
	if (mouthIdx !== undefined) {
		mouthMesh.morphTargetInfluences[mouthIdx] = value * 0.4;
	}
}

function mouthAnimationLoop() {
	if (!mic.active) {
		currentMouthValue = 0;
		applyMouthMorph(0);
		return;
	}

	currentMouthValue += (targetMouthValue - currentMouthValue) * MOUTH_LERP;
	if (currentMouthValue < 0.005) {
		currentMouthValue = 0;
	}
	applyMouthMorph(currentMouthValue);
	requestAnimationFrame(mouthAnimationLoop);
}

function ensureMicDrain(): void {
	if (mic.drainPromise) return;

	mic.drainPromise = (async () => {
		while (mic.active && state.detector && mic.frameQueue.length > 0) {
			const frame = mic.frameQueue.shift();
			if (!frame) continue;

			const result = await state.detector.process(frame);
			updateMeters(result);
			targetMouthValue = result.isVoiceStable ? Math.min(1, result.rms * 6) : 0;

			if (result.onVoiceStart) logLine("Voice START");
			if (result.onVoiceEnd) logLine("Voice END");
		}
	})().finally(() => {
		mic.drainPromise = null;
		if (mic.active && state.detector && mic.frameQueue.length > 0) {
			ensureMicDrain();
		}
	});
}

function queueMicFrame(frame: Int16Array): void {
	if (!mic.active || !state.detector) return;
	if (mic.frameQueue.length >= MAX_MIC_FRAME_BACKLOG) {
		mic.frameQueue.shift();
	}
	mic.frameQueue.push(frame);
	ensureMicDrain();
}

async function startSelfTest() {
	await ensureReady();
	const backend = getSelectedBackend();

	if (state.currentBackend !== backend.id) {
		await destroyVADState();
		state.currentBackend = backend.id;
	}

	if (state.detector) {
		await state.detector.destroy();
		state.detector = null;
	}

	resetMeters(backend);
	state.detector = await backend.createVoiceDetector();
	meterState.version = await state.detector.getVersion();
	meterState.listening = true;
	renderMeters();

	mic.frameQueue = [];
	mic.residual = new Float32Array(0);
	logLine(`${backend.label} detector ready (v${meterState.version}, threshold ${backend.defaultThreshold}, RMS floor ${backend.defaultRmsFloor}).`);

	findMouthMesh(state.head);
	if (!mouthMesh) {
		logLine("Could not locate face morph targets - mouth animation may not work.");
	}

	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
	});

	const audioCtx = new AudioContext();
	const nativeRate = audioCtx.sampleRate;
	const source = audioCtx.createMediaStreamSource(stream);
	const processor = audioCtx.createScriptProcessor(4096, 1, 1);
	const muteNode = audioCtx.createGain();
	muteNode.gain.value = 0;

	source.connect(processor);
	processor.connect(muteNode);
	muteNode.connect(audioCtx.destination);

	const hopSize = backend.hopSize;
	const ratio = nativeRate / TARGET_SAMPLE_RATE;

	processor.onaudioprocess = (event) => {
		if (!mic.active || !state.detector) return;

		const input = event.inputBuffer.getChannelData(0);
		const combined = new Float32Array(mic.residual.length + input.length);
		combined.set(mic.residual);
		combined.set(input, mic.residual.length);

		let offset = 0;
		const samplesNeeded = Math.ceil(hopSize * ratio);

		while (offset + samplesNeeded <= combined.length) {
			const frame = new Int16Array(hopSize);
			for (let index = 0; index < hopSize; index++) {
				const srcIdx = offset + index * ratio;
				const lo = Math.floor(srcIdx);
				const hi = Math.min(lo + 1, combined.length - 1);
				const frac = srcIdx - lo;
				const sample = combined[lo]! * (1 - frac) + combined[hi]! * frac;
				frame[index] = Math.max(-32768, Math.min(32767, Math.round(sample * 32768)));
			}
			offset += samplesNeeded;
			queueMicFrame(frame);
		}

		mic.residual = combined.slice(offset);
	};

	mic.stream = stream;
	mic.audioCtx = audioCtx;
	mic.processor = processor;
	mic.source = source;
	mic.active = true;

	requestAnimationFrame(mouthAnimationLoop);

	logLine(`Live-Test started with ${backend.label} (mic ${nativeRate} Hz -> ${TARGET_SAMPLE_RATE / 1000} kHz, hop ${hopSize}).`);
	setStatus("Live-Test", `Speak into the microphone - ${backend.label} drives the mouth and the live voice/noise meters.`);
}

async function stopSelfTest() {
	if (!mic.active) return;
	mic.active = false;
	targetMouthValue = 0;
	mic.frameQueue = [];

	try { mic.processor?.disconnect(); } catch (_) { /* ignore */ }
	try { mic.source?.disconnect(); } catch (_) { /* ignore */ }
	try { mic.audioCtx?.close(); } catch (_) { /* ignore */ }

	if (mic.stream) {
		for (const track of mic.stream.getTracks()) {
			track.stop();
		}
	}

	mic.processor = null;
	mic.source = null;
	mic.audioCtx = null;
	mic.stream = null;
	mic.residual = new Float32Array(0);

	if (mic.drainPromise) {
		try {
			await mic.drainPromise;
		} catch (error) {
			console.warn(error);
		}
	}
	mic.drainPromise = null;

	if (state.detector) {
		await state.detector.destroy();
		state.detector = null;
	}

	meterState.listening = false;
	meterState.rawVoice = false;
	meterState.stableVoice = false;
	meterState.inputLevel = 0;
	meterState.voiceLevel = 0;
	meterState.noiseLevel = 0;
	meterState.probability = 0;
	renderMeters();

	applyMouthMorph(0);
	logLine("Live-Test stopped.");
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

async function handleVAD() {
	try {
		await ensureReady();
		await runVADAnalysis();
	} catch (error) {
		console.error(error);
		setStatus("VAD failed", String(error), "destructive");
		logLine(`VAD failed: ${String(error)}`);
	}
}

async function handleSelfTest() {
	try {
		if (mic.active) {
			await stopSelfTest();
			setStatus("Stopped", "Live-Test stopped.");
			return;
		}
		await startSelfTest();
	} catch (error) {
		console.error(error);
		setStatus("Live-Test failed", String(error), "destructive");
		logLine(`Live-Test failed: ${String(error)}`);
	}
}

async function handleBackendChange() {
	const backend = getSelectedBackend();
	const changed = state.currentBackend !== backend.id;

	if (mic.active) {
		await stopSelfTest();
		setStatus("Backend changed", `Stopped the live stream. Restart Live-Test to use ${backend.label}.`, "warning");
	}

	if (changed) {
		await destroyVADState();
		state.currentBackend = backend.id;
		logLine(`Switched VAD backend to ${backend.label}.`);
	}

	resetMeters(backend);
	setStatus("Backend ready", `${backend.label} selected for the next offline analysis and microphone test.`);
}

async function handleSpeak() {
	try {
		await ensureReady();

		// Run VAD analysis automatically if no segments exist yet
		if (state.voiceSegments.length === 0) {
			await runVADAnalysis();
		}

		const head = state.head!;
		const audioBuffer = state.audioBuffer!;

		logLine("Playing reference audio with lip-sync...");
		setStatus("Speaking...", "Playing reference.wav through TalkingHead with word-level lip-sync.");

		const durationMs = audioBuffer.duration * 1000;
		const sampleWords = "Hello from defuss this is a talking head avatar demo with reference audio playback".split(" ");

		let wtimes: number[];
		let wdurations: number[];

		if (state.voiceSegments.length > 0) {
			const totalVoiceMs = state.voiceSegments.reduce(
				(sum, segment) => sum + (segment.endMs - segment.startMs),
				0,
			);
			const msPerWord = totalVoiceMs / sampleWords.length;
			wtimes = [];
			wdurations = [];

			let wordIdx = 0;
			for (const seg of state.voiceSegments) {
				const segDur = seg.endMs - seg.startMs;
				const wordsInSeg = Math.max(1, Math.round(segDur / msPerWord));
				const wordDur = segDur / wordsInSeg;
				for (
					let index = 0;
					index < wordsInSeg && wordIdx < sampleWords.length;
					index++, wordIdx++
				) {
					wtimes.push(seg.startMs + index * wordDur);
					wdurations.push(wordDur);
				}
			}

			while (wordIdx < sampleWords.length) {
				const last = state.voiceSegments[state.voiceSegments.length - 1]!;
				wtimes.push(last.endMs);
				wdurations.push(0);
				wordIdx++;
			}

			logLine(`Lip-sync: words mapped to ${state.voiceSegments.length} VAD segment(s).`);
		} else {
			const wordDuration = durationMs / sampleWords.length;
			wtimes = sampleWords.map((_, index) => index * wordDuration);
			wdurations = sampleWords.map(() => wordDuration);
			logLine("Lip-sync: even spread (no VAD data - run VAD first for better timing).");
		}

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
		setStatus("Speaking...", `Playing ${audioBuffer.duration.toFixed(1)}s of audio.`);

		// Process audio through VAD in real-time to update meters during playback
		await processAudioThroughVADRealtime(audioBuffer);

		// Reset status when playback finishes
		setTimeout(() => {
			setStatus("Ready", 'Done. Press "Speak" to play again.');
			logLine("Playback complete.");
		}, audioBuffer.duration * 1000);
	} catch (error) {
		console.error(error);
		setStatus("Speak failed", String(error), "destructive");
		logLine(`Speak failed: ${String(error)}`);
	}
}

async function processAudioThroughVADRealtime(audioBuffer: AudioBuffer): Promise<void> {
	const backend = getSelectedBackend();
	const hopSize = backend.hopSize;

	// Ensure detector is available for real-time processing
	if (!state.detector) {
		if (state.currentBackend !== backend.id) {
			await destroyVADState();
			state.currentBackend = backend.id;
		}
		state.detector = await backend.createVoiceDetector();
		meterState.version = await state.detector.getVersion();
		logLine(`${backend.label} detector ready for real-time playback analysis.`);
	}

	// Reset detector state for fresh analysis
	await state.detector.reset();

	const channelData = audioBuffer.getChannelData(0);
	const sampleRate = audioBuffer.sampleRate;
	const int16 = new Int16Array(channelData.length);

	for (let index = 0; index < channelData.length; index++) {
		const sample = Math.max(-1, Math.min(1, channelData[index]!));
		int16[index] = sample < 0 ? sample * 32768 : sample * 32767;
	}

	const samples = sampleRate !== TARGET_SAMPLE_RATE
		? resampleLinear(int16, sampleRate, TARGET_SAMPLE_RATE)
		: int16;

	const frameCount = Math.floor(samples.length / hopSize);
	const frameDurationMs = (hopSize / TARGET_SAMPLE_RATE) * 1000;
	const frameIntervalMs = frameDurationMs;

	meterState.listening = true;
	renderMeters();

	// Start mouth animation loop
	requestAnimationFrame(mouthAnimationLoop);

	let lastFrameIndex = -1;

	return new Promise((resolve) => {
		const startTime = performance.now();
		const durationMs = audioBuffer.duration * 1000;

		const processFrame = () => {
			const elapsed = performance.now() - startTime;
			const currentFrameIndex = Math.min(
				Math.floor(elapsed / frameIntervalMs),
				frameCount - 1
			);

			if (currentFrameIndex > lastFrameIndex && currentFrameIndex < frameCount) {
				lastFrameIndex = currentFrameIndex;
				const frame = samples.slice(currentFrameIndex * hopSize, (currentFrameIndex + 1) * hopSize);

				state.detector!.process(frame).then((result) => {
					updateMeters(result);
					targetMouthValue = result.isVoiceStable ? Math.min(1, result.rms * 6) : 0;
				}).catch(() => {
					// Ignore errors during playback VAD processing
				});
			}

			if (elapsed < durationMs) {
				requestAnimationFrame(processFrame);
			} else {
				// Cleanup
				meterState.listening = false;
				targetMouthValue = 0;
				renderMeters();
				resolve();
			}
		};

		requestAnimationFrame(processFrame);
	});
}

async function handleStop() {
	await stopSelfTest();
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

function AvatarDemoScreenContent() {
	return (
		<div class="demo-app-wrapper">
			<div id="demo-startup-overlay" class="demo-startup-overlay">
				<div class="demo-startup-modal">
					<CardTitle className="text-2xl mb-2 font-bold">TalkingHead + VAD Demo</CardTitle>
					<CardDescription class="mb-6 text-base">
						Experience real-time voice activity detection with 3D avatar lip-sync.
						Supports TEN-VAD, FireRed, and Silero backends.
					</CardDescription>
					<p class="muted-note mb-6 text-sm">
						Requires microphone access for Live-Test mode. Audio and AI processing runs entirely in your browser.
					</p>
					<Button onClick={handleStart} className="text-lg px-8 py-3">
						Start
					</Button>
				</div>
			</div>
			<main class="demo-shell">
				<Card class="demo-card">
					<CardHeader>
						<div class="flex items-center justify-between gap-3">
							<div>
								<CardTitle className="text-lg mb-2 font-bold">TalkingHead</CardTitle>
								<CardDescription>
									three.js + defuss-vad. <strong>Offline:</strong> analyse a WAV then play with backend-guided lip-sync. <strong>Live-Test:</strong> stream the mic through TenVAD, FireRed, or Silero and watch live voice vs. noise meters.
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent class="control-grid">
						<div id="demo-status">
							<Alert class="mt-4 border p-2 rounded-md bg-yellow-50 text-yellow-800">
								<AlertTitle>Not initialized</AlertTitle>
								<AlertDescription class="text-sm">
									Click "Initialize" to load the 3D avatar and decode the reference audio.
								</AlertDescription>
							</Alert>
						</div>

						<div class="field-grid">
							<Label for="demo-avatar">Avatar</Label>
							<select id="demo-avatar" class="demo-select">
								{AVATARS.map((avatar) => (
									<option key={avatar.id} value={avatar.id}>{avatar.label}</option>
								))}
							</select>
						</div>

						<div class="field-grid">
							<Label for="demo-backend">VAD backend</Label>
							<select id="demo-backend" class="demo-select" onChange={() => void handleBackendChange()}>
								{BACKENDS.map((backend) => (
									<option key={backend.id} value={backend.id}>{backend.label}</option>
								))}
							</select>
							<p class="muted-note">Switch between the lightweight WASM path and the ONNX backends without leaving the scene.</p>
						</div>

						<div class="field-grid">
							<Label>Offline Test</Label>
							<div class="button-row">
								<Button onClick={handleInit}>Initialize</Button>
								<Button onClick={handleVAD}>Run VAD</Button>
								<Button onClick={handleSpeak}>Speak</Button>
							</div>
						</div>

						<div class="field-grid">
							<Label>Live-Test (Microphone)</Label>
							<div class="button-row">
								<Button onClick={handleSelfTest}>Live-Test</Button>
								<Button variant="secondary" onClick={handleStop}>
									Stop
								</Button>
								<Button variant="secondary" onClick={handleResetLog}>
									Clear log
								</Button>
							</div>
						</div>

						<div class="field-grid">
							<Label>Realtime meters</Label>
							<div id="demo-meters">{renderMetersMarkup()}</div>
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
		</div>
	);
}

export { AvatarDemoScreenContent as AvatarDemoScreen };
