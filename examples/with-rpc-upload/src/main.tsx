import { render, $, createRef, createStore } from "defuss";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
	Progress,
	Badge,
} from "defuss-shadcn";
import { uploadFile } from "./upload-client.js";

interface UploadState {
	fileName: string | null;
	status: "idle" | "uploading" | "complete" | "error";
	progress: number;
	statusText: string;
	fileSize: number | null;
	sha256: string | null;
	md5: string | null;
	durationMs: number | null;
	uploadId: string | null;
	bytesReceived: number | null;
	error: string | null;
}

const store = createStore<UploadState>({
	fileName: null,
	status: "idle",
	progress: 0,
	statusText: "",
	fileSize: null,
	sha256: null,
	md5: null,
	durationMs: null,
	uploadId: null,
	bytesReceived: null,
	error: null,
});

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDuration = (ms: number): string => {
	if (ms < 1000) return `${ms.toFixed(2)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
};

const cardRef = createRef<HTMLDivElement>();
const inputRef = createRef<HTMLInputElement>();
const dropAreaRef = createRef<HTMLDivElement>();
let uploading = false;

const resetState = () => {
	store.set({
		fileName: null,
		status: "idle",
		progress: 0,
		statusText: "",
		fileSize: null,
		sha256: null,
		md5: null,
		durationMs: null,
		uploadId: null,
		bytesReceived: null,
		error: null,
	});
};

const processFile = async (file: File) => {
	if (uploading) return;
	uploading = true;

	store.set({
		fileName: file.name,
		status: "uploading",
		progress: 0,
		statusText: `Uploading ${file.name}...`,
		fileSize: file.size,
		sha256: null,
		md5: null,
		durationMs: null,
		uploadId: null,
		bytesReceived: null,
		error: null,
	});

	try {
		for await (const event of uploadFile(file, rpcBaseUrl)) {
			if (event.type === "sending") {
				store.set({ progress: event.percent, statusText: `Sending: ${event.percent}%` });
			} else if (event.type === "receiving") {
				store.set({ progress: event.percent, statusText: `Server receiving: ${event.percent}%` });
			} else if (event.type === "complete") {
				store.set({
					status: "complete",
					progress: 100,
					statusText: "Upload complete!",
					sha256: event.sha256,
					md5: event.md5,
					durationMs: event.durationMs,
					uploadId: event.uploadId,
					bytesReceived: event.bytesReceived,
				});
			}
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : "Upload failed";
		store.set({
			status: "error",
			statusText: message,
			error: message,
		});
	} finally {
		uploading = false;
	}
};

const onFileChange = (e: Event) => {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file) processFile(file);
};

const onDrop = (files: FileList | null) => {
	const file = files?.[0];
	if (file) processFile(file);
};

const renderContent = () => {
	const { status, fileName, statusText, progress, sha256, md5, durationMs, uploadId, bytesReceived } = store.value;

	if (status === "idle") {
		return (
			<>
				<CardHeader>
					<CardTitle class="text-2xl">File Upload</CardTitle>
					<CardDescription class="text-muted-foreground py-2">The transport mechanism used here is binary chunked transfer over RPC.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div
						ref={dropAreaRef}
						class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
						onClick={() => inputRef.current?.click()}
						onDragOver={(e: DragEvent) => {
							e.preventDefault();
							$(dropAreaRef).addClass("border-primary/50 bg-muted/50");
						}}
						onDragLeave={() => {
							$(dropAreaRef).removeClass("border-primary/50 bg-muted/50");
						}}
						onDrop={(e: DragEvent) => {
							e.preventDefault();
							$(dropAreaRef).removeClass("border-primary/50 bg-muted/50");
							onDrop(e.dataTransfer?.files ?? null);
						}}
					>
						<svg class="mx-auto h-8 w-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
						</svg>
						<p class="mt-2 text-sm text-muted-foreground">
							Drop a file here, or <span class="text-primary font-medium">click to browse</span>
						</p>
						<p class="mt-1 text-xs text-muted-foreground">Any file type supported</p>
						<input
							ref={inputRef}
							type="file"
							class="hidden"
							onChange={onFileChange}
						/>
					</div>
				</CardContent>
				<CardFooter class="text-xs text-muted-foreground">
					RPC: {rpcBaseUrl}
				</CardFooter>
			</>
		);
	}

	return (
		<>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div>
						<CardTitle class="flex items-center gap-2">
							{fileName}
							{status === "uploading" && <Badge variant="secondary">Uploading</Badge>}
							{status === "complete" && <Badge variant="default">Complete</Badge>}
							{status === "error" && <Badge variant="destructive">Error</Badge>}
						</CardTitle>
						<CardDescription>{statusText}</CardDescription>
					</div>
					<Button variant="ghost" size="sm" onClick={resetState}>
						Upload new
					</Button>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<Progress value={progress} />
				{status === "complete" && (
					<div class="mt-4 space-y-3">
						<div class="grid grid-cols-2 gap-3">
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Size</p>
								<p class="font-medium">{bytesReceived ? formatBytes(bytesReceived) : "-"}</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Duration</p>
								<p class="font-medium">{durationMs ? formatDuration(durationMs) : "-"}</p>
							</div>
						</div>
						<div class="space-y-2">
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">SHA-256</p>
								<code class="inline-block text-xs bg-muted p-2 rounded-md break-all">
									{sha256}
								</code>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">MD5</p>
								<code class="inline-block text-xs bg-muted p-2 rounded-md break-all">
									{md5}
								</code>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Upload ID</p>
								<code class="inline-block text-xs bg-muted p-2 rounded-md break-all">
									{uploadId}
								</code>
							</div>
						</div>
					</div>
				)}
			</CardContent>
			<CardFooter class="text-xs text-muted-foreground">
				RPC: {rpcBaseUrl}
			</CardFooter>
		</>
	);
};

const App = () => {
	const onMount = () => {
		store.subscribe(() => {
			$(cardRef).jsx(renderContent());
		});
	};

	return (
		<div class="mx-auto max-w-2xl py-12 px-6 space-y-6">
			<div class="space-y-2">
				<h1 class="text-3xl font-bold tracking-tight">defuss-rpc File Upload</h1>
				<p class="text-muted-foreground">Upload files with progress tracking and integrity verification.</p>
			</div>
			<Card ref={cardRef} onMount={onMount} class="shadow-md p-6 rounded-md">
				{renderContent()}
			</Card>
		</div>
	);
};

render(<App />, $("#app")._nodes[0] as HTMLElement);
