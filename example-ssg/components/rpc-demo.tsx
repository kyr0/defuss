import type { Props, FC } from "defuss";
import { $, createRef } from "defuss";
import type rpcExports from "../rpc.js";
import type {
	RpcDemoImage,
	RpcDemoImageSummary,
	RpcDemoUploadResult,
} from "../rpc.js";

export interface RpcDemoProps extends Props { }

const uploadHandlerName = "image-canvas-demo";

const formatBytes = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDuration = (ms: number) => {
	if (ms < 10) return `${ms.toFixed(2)} ms`;
	return `${Math.round(ms)} ms`;
};

const shortHash = (value: string) => {
	if (value.length <= 20) return value;
	return `${value.slice(0, 12)}...${value.slice(-8)}`;
};

const getErrorMessage = (error: unknown) => {
	if (error instanceof Error) return error.message;
	return String(error);
};

const RpcDemo: FC<RpcDemoProps> = () => {
	const inputARef = createRef<HTMLInputElement>();
	const inputBRef = createRef<HTMLInputElement>();
	const inputNameRef = createRef<HTMLInputElement>();
	const rpcResultRef = createRef<HTMLQuoteElement>();
	const dropAreaRef = createRef<HTMLLabelElement>();
	const fileInputRef = createRef<HTMLInputElement>();
	const progressRef = createRef<HTMLProgressElement>();
	const progressLabelRef = createRef<HTMLSpanElement>();
	const statusRef = createRef<HTMLParagraphElement>();
	const detailsRef = createRef<HTMLDivElement>();
	const previewPlaceholderRef = createRef<HTMLDivElement>();
	const previewImageRef = createRef<HTMLImageElement>();
	const captionRef = createRef<HTMLParagraphElement>();

	type RpcApi = typeof rpcExports;
	let rpcClientPromise: Promise<RpcApi> | null = null;
	let isUploading = false;
	let isRestoring = false;
	let activePreviewUrl: string | null = null;
	let dragDepth = 0;

	const revokePreviewUrl = () => {
		if (activePreviewUrl) {
			URL.revokeObjectURL(activePreviewUrl);
			activePreviewUrl = null;
		}
	};

	const setStatus = (message: string) => {
		$(statusRef).text(message);
	};

	const setProgress = (percent: number) => {
		if (progressRef.current) {
			progressRef.current.value = percent;
		}
		$(progressLabelRef).text(`${Math.round(percent)}%`);
	};

	const setDropAreaActive = (active: boolean) => {
		if (!dropAreaRef.current) return;
		if (active) {
			$(dropAreaRef).addClass("rpc-demo-drop-active");
			return;
		}

		$(dropAreaRef).removeClass("rpc-demo-drop-active");
	};

	const setRpcResult = (message: string) => {
		$(rpcResultRef).text(message);
	};

	const getRpcInputs = () => ({
		a: Number($(inputARef).val()) || 0,
		b: Number($(inputBRef).val()) || 0,
		name: String($(inputNameRef).val() || "defuss"),
	});

	const renderFacts = (
		summary?: RpcDemoImageSummary,
		stats?: { uploadMs?: number; fetchMs?: number },
	) => {
		if (!summary) {
			$(detailsRef).jsx(
				<div class="rpc-demo-empty-state">
					<strong>JSONL-backed binary storage</strong>
					<p>
						The server stores the raw image bytes with SHA-256 and MD5 hashes,
						then the browser fetches that payload back through typed RPC for a
						direct image preview.
					</p>
				</div>,
			);
			return;
		}

		const createdAt =
			summary.createdAt instanceof Date
				? summary.createdAt
				: new Date(summary.createdAt);

		$(detailsRef).jsx(
			<dl class="rpc-demo-metrics">
				<div>
					<dt>File</dt>
					<dd>{summary.fileName}</dd>
				</div>
				<div>
					<dt>Size</dt>
					<dd>{formatBytes(summary.size)}</dd>
				</div>
				<div>
					<dt>Stored</dt>
					<dd>{createdAt.toLocaleString()}</dd>
				</div>
				<div>
					<dt>MIME</dt>
					<dd>{summary.mimeType}</dd>
				</div>
				<div>
					<dt>SHA-256</dt>
					<dd>{shortHash(summary.sha256)}</dd>
				</div>
				<div>
					<dt>MD5</dt>
					<dd>{shortHash(summary.md5)}</dd>
				</div>
				{stats?.uploadMs !== undefined && (
					<div>
						<dt>Upload</dt>
						<dd>{formatDuration(stats.uploadMs)}</dd>
					</div>
				)}
				{stats?.fetchMs !== undefined && (
					<div>
						<dt>RPC fetch</dt>
						<dd>{formatDuration(stats.fetchMs)}</dd>
					</div>
				)}
			</dl>,
		);
	};

	const showPreviewPlaceholder = (title: string, subtitle: string) => {
		revokePreviewUrl();

		if (previewImageRef.current) {
			previewImageRef.current.hidden = true;
			previewImageRef.current.removeAttribute("src");
			previewImageRef.current.alt = "";
		}

		if (previewPlaceholderRef.current) {
			previewPlaceholderRef.current.hidden = false;
		}

		$(previewPlaceholderRef).jsx(
			<div class="rpc-demo-preview-empty-state">
				<strong>{title}</strong>
				<p>{subtitle}</p>
			</div>,
		);

		$(captionRef).text("The uploaded image appears here after the RPC round-trip.");
	};

	const showPreviewImage = async (imageAsset: RpcDemoImage) => {
		const previewImage = previewImageRef.current;
		if (!previewImage) return;

		const previewUrl = URL.createObjectURL(
			new Blob([imageAsset.imageData], { type: imageAsset.mimeType }),
		);

		try {
			await new Promise<void>((resolve, reject) => {
				const probe = new Image();
				probe.decoding = "async";
				probe.onload = () => resolve();
				probe.onerror = () => {
					reject(new Error(`Failed to display ${imageAsset.fileName}.`));
				};
				probe.src = previewUrl;
			});

			revokePreviewUrl();
			activePreviewUrl = previewUrl;

			previewImage.hidden = false;
			previewImage.src = previewUrl;
			previewImage.alt = imageAsset.fileName;

			if (previewPlaceholderRef.current) {
				previewPlaceholderRef.current.hidden = true;
				$(previewPlaceholderRef).empty();
			}

			$(captionRef).text(
				`${imageAsset.fileName} rendered as a direct image preview from the RPC round-trip.`,
			);
		} catch (error) {
			URL.revokeObjectURL(previewUrl);
			throw error;
		}
	};

	const makeRpcClient = async () => {
		if (!rpcClientPromise) {
			rpcClientPromise = import("defuss-rpc/client.js").then(
				({ createRpcClient }) => createRpcClient<RpcApi>(),
			);
		}
		return rpcClientPromise;
	};

	const callAdd = async () => {
		try {
			const rpc = await makeRpcClient();
			const { a, b } = getRpcInputs();
			const sum = await rpc.mathApi.add(a, b);
			setRpcResult(`${a} + ${b} = ${sum}`);
		} catch (error) {
			setRpcResult(`mathApi.add failed: ${getErrorMessage(error)}`);
		}
	};

	const callMultiply = async () => {
		try {
			const rpc = await makeRpcClient();
			const { a, b } = getRpcInputs();
			const product = await rpc.mathApi.multiply(a, b);
			setRpcResult(`${a} × ${b} = ${product}`);
		} catch (error) {
			setRpcResult(`mathApi.multiply failed: ${getErrorMessage(error)}`);
		}
	};

	const callGreet = async () => {
		try {
			const rpc = await makeRpcClient();
			const { name } = getRpcInputs();
			const greeting = await rpc.greetApi.hello(name);
			setRpcResult(greeting);
		} catch (error) {
			setRpcResult(`greetApi.hello failed: ${getErrorMessage(error)}`);
		}
	};

	const loadStoredPreview = async (summary: RpcDemoImageSummary) => {
		const rpc = await makeRpcClient();
		const fetchStartedAt = performance.now();
		const imageAsset = await rpc.imageDemoApi.getUpload(summary.id);
		const fetchMs = performance.now() - fetchStartedAt;

		if (!imageAsset) {
			throw new Error(`Stored upload ${summary.id} is no longer available.`);
		}

		await showPreviewImage({
			...imageAsset,
			fileName: summary.fileName,
			mimeType: summary.mimeType,
			size: summary.size,
			sha256: summary.sha256,
			md5: summary.md5,
			createdAt: summary.createdAt,
		});
		return fetchMs;
	};

	const restoreLatestUpload = async () => {
		const rpc = await makeRpcClient();
		const latest = await rpc.imageDemoApi.getLatestUpload();

		if (!latest) {
			renderFacts();
			setStatus("Select an image to upload it through RPC and persist it in JSONL.");
			return;
		}

		const fetchMs = await loadStoredPreview(latest);

		renderFacts(latest, { fetchMs });
		setStatus(
			`Loaded the latest stored image from defuss-db in ${formatDuration(fetchMs)}.`,
		);
	};

	const uploadFile = async (file: File) => {
		if (!file || isUploading || isRestoring) return;

		if (!file.type.startsWith("image/")) {
			setStatus("Please choose an image file for the preview demo.");
			return;
		}

		isUploading = true;
		if (fileInputRef.current) {
			fileInputRef.current.disabled = true;
		}
		setProgress(0);
		setStatus(`Uploading ${file.name} over RPC...`);

		try {
			const { upload } = await import("defuss-rpc/client.js");
			let completedUpload:
				| {
					result: RpcDemoUploadResult;
					uploadId: string;
					bytesReceived: number;
					sha256: string;
					md5: string;
					durationMs: number;
				}
				| null = null;

			for await (const uploadEvent of upload<RpcDemoUploadResult>(
				uploadHandlerName,
				file,
			)) {
				if (uploadEvent.type === "sending") {
					setProgress(uploadEvent.percent);
					setStatus(`Sending ${file.name}: ${Math.round(uploadEvent.percent)}%.`);
					continue;
				}

				if (uploadEvent.type === "receiving") {
					setProgress(uploadEvent.percent);
					setStatus(
						`Server confirmed ${formatBytes(uploadEvent.bytesReceived)} received.`,
					);
					continue;
				}

				completedUpload = uploadEvent;
			}

			if (!completedUpload) {
				throw new Error("The RPC upload finished without a completion frame.");
			}

			setProgress(100);
			setStatus("Upload complete. Finalizing metadata and fetching the preview...");

			const rpc = await makeRpcClient();
			const summary = await rpc.imageDemoApi.finalizeUpload(
				completedUpload.uploadId,
				file.name,
				file.type,
			);
			const fetchMs = await loadStoredPreview(summary);

			renderFacts(summary, {
				uploadMs: completedUpload.durationMs,
				fetchMs,
			});
			setStatus(
				`Stored ${file.name} in defuss-db JSONL and streamed it back over typed RPC.`,
			);
		} catch (error) {
			showPreviewPlaceholder("Upload failed", getErrorMessage(error));
			setStatus(`Upload failed: ${getErrorMessage(error)}`);
		} finally {
			isUploading = false;
			if (fileInputRef.current) {
				fileInputRef.current.disabled = false;
				fileInputRef.current.value = "";
			}
		}
	};

	const handleFileChange = (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		void uploadFile(file);
	};

	const handleDragEnter = (event: DragEvent) => {
		event.preventDefault();
		dragDepth += 1;
		setDropAreaActive(true);
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "copy";
		}
		setDropAreaActive(true);
	};

	const handleDragLeave = (event: DragEvent) => {
		event.preventDefault();
		dragDepth = Math.max(0, dragDepth - 1);
		if (dragDepth === 0) {
			setDropAreaActive(false);
		}
	};

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		dragDepth = 0;
		setDropAreaActive(false);

		const file = event.dataTransfer?.files?.[0];
		if (!file) {
			return;
		}

		void uploadFile(file);
	};

	const handleMount = () => {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return;
		}

		isRestoring = true;
		if (fileInputRef.current) {
			fileInputRef.current.disabled = true;
		}

		showPreviewPlaceholder(
			"RPC image pipeline",
			"Upload an image, store the bytes in JSONL, then render the round-trip as a normal image preview.",
		);
		setRpcResult("Click a button to call mathApi.add, mathApi.multiply, or greetApi.hello.");
		renderFacts();
		void restoreLatestUpload().catch((error) => {
			showPreviewPlaceholder("Preview unavailable", getErrorMessage(error));
			setStatus(`Unable to restore the last upload: ${getErrorMessage(error)}`);
		}).finally(() => {
			isRestoring = false;
			if (fileInputRef.current && !isUploading) {
				fileInputRef.current.disabled = false;
			}
		});
	};

	return (
		<article
			id="rpc-demo"
			onMount={handleMount}
			onUnmount={revokePreviewUrl}
		>
			<header class="rpc-demo-header">
				<div>
					<strong>RPC playground</strong>
					<p>
						Try the typed math and greeting APIs, then upload an image over
						defuss-rpc, persist it with defuss-db JSONL, and fetch it back as
						an ArrayBuffer for a direct image preview.
					</p>
				</div>
				<span class="rpc-demo-pill">Typed RPC + binary round-trip</span>
			</header>
			<div class="rpc-demo-shell">
				<section class="rpc-demo-panel rpc-demo-panel-accent">
					<div class="rpc-demo-inline-section">
						<strong>Quick typed RPC calls</strong>
						<div class="rpc-demo-inline-grid">
							<label>
								<span>A</span>
								<input ref={inputARef} type="number" value="3" placeholder="a" />
							</label>
							<label>
								<span>B</span>
								<input ref={inputBRef} type="number" value="7" placeholder="b" />
							</label>
							<label class="rpc-demo-inline-grid-wide">
								<span>Name</span>
								<input
									ref={inputNameRef}
									type="text"
									value="defuss"
									placeholder="name"
								/>
							</label>
						</div>
					</div>
				</section>
				<section class="rpc-demo-panel">
					<div class="rpc-demo-inline-actions">
						<button type="button" onClick={callAdd}>mathApi.add(a, b)</button>
						<button type="button" class="secondary" onClick={callMultiply}>
							mathApi.multiply(a, b)
						</button>
						<button type="button" class="contrast" onClick={callGreet}>
							greetApi.hello(name)
						</button>
					</div>
					<blockquote ref={rpcResultRef} class="rpc-demo-inline-result">
						Click a button to call mathApi.add, mathApi.multiply, or greetApi.hello.
					</blockquote>
				</section>
			</div>

			<div class="rpc-demo-divider" />

			<div>
				<strong>RPC Upload Demo</strong>
				<p>
					Try the typed math and greeting APIs, then upload an image over
					defuss-rpc, persist it with defuss-db JSONL, and fetch it back as
					an ArrayBuffer for a direct image preview.
				</p>
			</div>

			<div class="rpc-demo-shell">

				<section class="rpc-demo-panel rpc-demo-panel-accent">

					<label
						ref={dropAreaRef}
						class="rpc-demo-upload-field rpc-demo-drop-area"
						onDragEnter={handleDragEnter}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<span>Pick an image</span>
						<strong>Drop an image here</strong>
						<small>or click to browse from disk</small>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleFileChange}
						/>
					</label>
					<p ref={statusRef} class="rpc-demo-status">
						Select an image to upload it through RPC and persist it in JSONL.
					</p>
					<div class="rpc-demo-progress-wrap">
						<div class="rpc-demo-progress-row">
							<span>Transport progress</span>
							<strong ref={progressLabelRef}>0%</strong>
						</div>
						<progress ref={progressRef} max="100" value="0" />
					</div>
					<div ref={detailsRef} class="rpc-demo-details" />


				</section>

				<section class="rpc-demo-panel rpc-demo-preview-panel">
					<div class="rpc-demo-preview-frame">
						<div ref={previewPlaceholderRef} class="rpc-demo-preview-placeholder" />
						<img
							ref={previewImageRef}
							class="rpc-demo-image"
							alt=""
							hidden={true}
						/>
					</div>
					<p ref={captionRef} class="rpc-demo-caption">
						The uploaded image appears here after the RPC round-trip.
					</p>
				</section>
			</div>
		</article >
	);
};

export default RpcDemo;
