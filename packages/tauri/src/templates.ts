import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "rust_templates");

const readTemplate = (name: string): string =>
	readFileSync(join(TEMPLATES_DIR, name), "utf-8");

const interpolate = (template: string, vars: Record<string, string | number | boolean>): string =>
	template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
		const value = vars[key];
		if (value === undefined) return `{{${key}}}`;
		return String(value);
	});

const interpolateConditional = (template: string, vars: Record<string, string | number | boolean>): string => {
	let result = template;
	// Handle {{#key}}...{{/key}} blocks
	result = result.replace(/\{\{\#(\w+)\}\}\n?([\s\S]*?)\{\{\/\1\}\}/g, (_match, key, content) => {
		return vars[key] ? content : "";
	});
	// Handle simple {{key}} placeholders
	result = interpolate(result, vars);
	return result;
};

const q = (value: string): string => `"${value}"`;

const TAURI_SCHEMA = "https://schema.tauri.app/config/2";
const CAPABILITY_SCHEMA = "../gen/schemas/desktop-schema.json";
const CAPABILITY_IDENTIFIER = "default";
const CAPABILITY_DESCRIPTION = "Default capability for the generated defuss-tauri main window.";
const CAPABILITY_WINDOWS = ["main"];
const SHELL_PERMISSION_NAME = "binaries/node";

const PERMISSIVE_CSP = "default-src * data: 'unsafe-inline' 'unsafe-eval'; connect-src * ipc://localhost ws://* wss://*;";

const PERMISSIVE_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Headers": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
	"Access-Control-Expose-Headers": "*",
	"Access-Control-Max-Age": "86400",
	"Timing-Allow-Origin": "*",
	"Service-Worker-Allowed": "/",
	"Permissions-Policy": "accelerometer=*, autoplay=*, bluetooth=*, camera=*, clipboard-read=*, clipboard-write=*, display-capture=*, fullscreen=*, gamepad=*, geolocation=*, gyroscope=*, hid=*, idle-detection=*, local-fonts=*, magnetometer=*, microphone=*, midi=*, payment=*, picture-in-picture=*, publickey-credentials-create=*, publickey-credentials-get=*, screen-wake-lock=*, serial=*, speaker-selection=*, usb=*, web-share=*, xr-spatial-tracking=*",
};

const MACOS_MIN_SYSTEM_VERSION = "12.0";
const MACOS_ENTITLEMENTS_PATH = "./Entitlements.plist";
const MACOS_INFO_PLIST_PATH = "./Info.plist";

export const renderCargoToml = (rustName: string, version: string, tauriVersion: string, tauriShellVersion: string): string =>
	interpolate(readTemplate("Cargo.toml"), {
		rustName,
		version,
		tauriVersion,
		tauriShellVersion,
	});

export const renderRustLib = (vars: {
	host: string;
	port: string;
	title: string;
	width: number;
	height: number;
	resizable: boolean;
	fullscreen: boolean;
	sidecarName: string;
	tcpTimeoutSecs: number;
	tcpPollIntervalMs: number;
	gracefulShutdownMs: number;
}): string =>
	interpolate(readTemplate("lib.rs"), {
		host: vars.host,
		port: vars.port,
		title: vars.title,
		width: vars.width,
		height: vars.height,
		resizable: vars.resizable,
		fullscreen: vars.fullscreen,
		sidecarName: vars.sidecarName,
		tcpTimeoutSecs: vars.tcpTimeoutSecs,
		tcpPollIntervalMs: vars.tcpPollIntervalMs,
		gracefulShutdownMs: vars.gracefulShutdownMs,
	});

export const renderTauriConfig = (vars: {
	productName: string;
	version: string;
	identifier: string;
	beforeDevCommand: string;
	devUrl: string;
	frontendDist: string;
	dangerouslyPermissive: boolean;
}): string => {
	const base = interpolate(readTemplate("tauri.conf.json"), {
		productName: vars.productName,
		version: vars.version,
		identifier: vars.identifier,
		beforeDevCommand: vars.beforeDevCommand,
		devUrl: vars.devUrl,
		frontendDist: vars.frontendDist,
	});

	// Parse, inject permissive security settings, and re-serialize
	const config = JSON.parse(base);
	if (vars.dangerouslyPermissive) {
		config.app.security.csp = PERMISSIVE_CSP;
		config.app.security.devCsp = PERMISSIVE_CSP;
		config.app.security.dangerousDisableAssetCspModification = true;
		config.app.security.headers = PERMISSIVE_HEADERS;
	}
	return `${JSON.stringify(config, (_key, value) => (value === undefined ? undefined : value), 2)}\n`;
};

export const renderCapability = (): string =>
	`${readTemplate("capability.json")}`;

// Re-export constants for use by index.ts
export {
	TAURI_SCHEMA,
	CAPABILITY_SCHEMA,
	CAPABILITY_IDENTIFIER,
	CAPABILITY_DESCRIPTION,
	CAPABILITY_WINDOWS,
	SHELL_PERMISSION_NAME,
	PERMISSIVE_CSP,
	PERMISSIVE_HEADERS,
	MACOS_MIN_SYSTEM_VERSION,
	MACOS_ENTITLEMENTS_PATH,
	MACOS_INFO_PLIST_PATH,
};

export const renderMacEntitlements = (permissive: boolean): string =>
	interpolateConditional(readTemplate("Entitlements.plist"), { permissive });

export const renderMacInfoPlist = (permissive: boolean): string =>
	interpolateConditional(readTemplate("Info.plist"), { permissive });

export const renderManagedReadme = (vars: {
	tauriConfigPath: string;
	appStagePath: string;
	nodeSidecarPath: string;
	nodeResourcesPath: string;
	identifier: string;
	devUrl: string;
}): string =>
	interpolate(readTemplate("README.md"), vars);
