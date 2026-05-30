import { $, createRef, Router } from "defuss";
import {
	Alert,
	AlertTitle,
	AlertDescription,
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
	Label,
	DropArea,
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
	toast,
} from "defuss-shadcn";
import type { OcrPage } from "../../../rpc/ocr-api.js";
import { getRpcClient } from "../../lib/rpc-client";
import { t } from "../../i18n";
import { OCR_DEFAULT_PROMPT } from "../../../ocr.config.js";
import { ocrResultStore } from "../../lib/ocr-store";
import { correctFileOrientation, rotateImage90CW, rotateImage90CCW } from "../../lib/image-orientation.js";

export function OcrScreen() {
	const containerRef = createRef<HTMLDivElement>();

	// Closure state
	let droppedFile: File | null = null;
	let currentObjectUrl: string | null = null;
	let isProcessing = false;
	const errorAlertRef = createRef<HTMLDivElement>();

	const renderUploadView = () => {
		const promptRef = createRef<HTMLTextAreaElement>();
		const dropAreaContentRef = createRef<HTMLDivElement>();
		const dropAreaWrapperRef = createRef<HTMLDivElement>();
		const uploadBtnRef = createRef<HTMLButtonElement>();

		const resetFile = () => {
			droppedFile = null;
			if (currentObjectUrl) {
				URL.revokeObjectURL(currentObjectUrl);
				currentObjectUrl = null;
			}
			$(dropAreaContentRef).update(renderDropPlaceholder());
		};

		const renderDropPlaceholder = () => (
			<div ref={dropAreaContentRef} class="flex flex-col items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-muted-foreground"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" x2="12" y1="3" y2="15" />
				</svg>
				<p class="text-sm text-muted-foreground">{t("ocr.drop_hint")}</p>
				<p class="text-xs text-muted-foreground">{t("ocr.browse_button")}</p>
			</div>
		);

		const progressBarRef = createRef<HTMLDivElement>();
		const progressPercentRef = createRef<HTMLParagraphElement>();

		const renderProgressView = () => (
			<div ref={dropAreaWrapperRef} class="grid gap-2">
				<div class="flex flex-col items-center justify-center gap-4 min-h-[250px] w-full rounded-lg border border-dashed p-6">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="40"
						height="40"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="text-primary animate-pulse"
					>
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
						<path d="M14 2v6h6" />
						<path d="M16 13H8" />
						<path d="M16 17H8" />
						<path d="M10 9H8" />
					</svg>
					<p class="text-sm font-medium text-foreground">
						{t("ocr.processing_label")}
					</p>
					<div class="w-full max-w-xs">
						<div
							class="bg-primary/20 relative h-2 w-full overflow-hidden rounded-full"
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={0}
						>
							<div
								ref={progressBarRef}
								class="bg-primary h-full flex-1 transition-all"
								style="width: 0%"
							/>
						</div>
					</div>
					<p ref={progressPercentRef} class="text-xs text-muted-foreground">
						0%
					</p>
				</div>
			</div>
		);

		const applyRotation = async (rotateFn: (file: File) => Promise<File>) => {
			if (!droppedFile || !droppedFile.type.startsWith("image/")) return;
			const rotated = await rotateFn(droppedFile);
			const newUrl = URL.createObjectURL(rotated);
			const oldUrl = currentObjectUrl;
			droppedFile = rotated;
			currentObjectUrl = newUrl;
			// Find the <img> in the preview and swap its src
			const imgEl = dropAreaContentRef.current?.querySelector("img");
			if (imgEl) {
				imgEl.src = newUrl;
			}
			if (oldUrl) URL.revokeObjectURL(oldUrl);
		};

		const renderFilePreview = (file: File, objectUrl: string) => {
			const type = file.type;

			let preview: JSX.Element | null = null;
			if (type.startsWith("image/")) {
				preview = (
					<div class="flex flex-col items-center gap-2">
						<img
							src={objectUrl}
							alt={file.name}
							class="max-h-[180px] max-w-full rounded object-contain"
						/>
						<div class="flex gap-2">
							<button
								type="button"
								class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
								onClick={(e: MouseEvent) => {
									e.stopPropagation();
									applyRotation(rotateImage90CCW);
								}}
								aria-label="Rotate left"
								title="Rotate left"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M9 3 5 7h4v4H5l4-4Z" />
									<path d="M5 7a10 10 0 0 1 17.5-4.5" />
								</svg>
								Rotate Left
							</button>
							<button
								type="button"
								class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
								onClick={(e: MouseEvent) => {
									e.stopPropagation();
									applyRotation(rotateImage90CW);
								}}
								aria-label="Rotate right"
								title="Rotate right"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="m15 3 4 4h-4v4h4l-4-4Z" />
									<path d="M19 7a10 10 0 0 1-17.5 4.5" />
								</svg>
								Rotate Right
							</button>
						</div>
					</div>
				);
			} else if (type.startsWith("video/")) {
				preview = (
					<video
						src={objectUrl}
						controls
						class="max-h-[180px] max-w-full rounded"
					/>
				);
			} else if (type.startsWith("audio/")) {
				preview = <audio src={objectUrl} controls class="max-w-full" />;
			}

			return (
				<div
					ref={dropAreaContentRef}
					class="relative flex flex-col items-center gap-2 w-full"
				>
					<button
						type="button"
						class="absolute top-0 right-0 p-1 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
						onClick={(e: MouseEvent) => {
							e.stopPropagation();
							URL.revokeObjectURL(objectUrl);
							resetFile();
						}}
						aria-label={t("common.close")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="18" x2="6" y1="6" y2="18" />
							<line x1="6" x2="18" y1="6" y2="18" />
						</svg>
					</button>
					{preview}
					<p class="text-sm text-foreground font-medium truncate max-w-full text-center">
						{file.name}
					</p>
					<p class="text-xs text-muted-foreground">
						({(file.size / 1024).toFixed(1)} KB)
					</p>
				</div>
			);
		};

		const updateFileName = async (file: File) => {
			// Correct EXIF orientation so the preview shows the image upright
			const correctedFile = await correctFileOrientation(file);
			if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
			droppedFile = correctedFile;
			currentObjectUrl = URL.createObjectURL(correctedFile);
			$(dropAreaContentRef).update(renderFilePreview(correctedFile, currentObjectUrl));
		};

		const handleDrop = async (e: DragEvent) => {
			const file = e.dataTransfer?.files[0];
			if (file) await updateFileName(file);
		};

		const handleFileSelect = async (files: FileList) => {
			const file = files[0];
			if (file) await updateFileName(file);
		};

		const handleUpload = async () => {
			if (!droppedFile) {
				toast({
					category: "warning",
					title: t("ocr.no_file_title"),
					description: t("ocr.no_file_description"),
				});
				return;
			}

			if (isProcessing) return;
			isProcessing = true;

			// Replace drop area with centered progress bar
			$(dropAreaWrapperRef).update(renderProgressView());
			$(uploadBtnRef).attr("disabled", "true");

			// Exponential-decay progress animation (fast start, asymptotic toward 100%)
			let progress = 5;
			let factor = 0.15;

			const updateProgress = (value: number) => {
				if (progressBarRef.current) {
					progressBarRef.current.style.width = `${value}%`;
				}
				if (progressPercentRef.current) {
					progressPercentRef.current.textContent = `${value}%`;
				}
			};

			// Use onMount timing — refs are populated after morph completes
			setTimeout(() => updateProgress(progress), 50);

			const progressInterval = setInterval(() => {
				progress = Math.min(progress + (100 - progress) * factor, 99.5);
				factor *= 0.85;
				updateProgress(Math.round(progress));
			}, 500);

			const t0 = performance.now();

			try {
				// droppedFile is already orientation-corrected from updateFileName
				// Read file as base64
				const arrayBuffer = await droppedFile.arrayBuffer();
				const bytes = new Uint8Array(arrayBuffer);
				let binary = "";

				for (let i = 0; i < bytes.length; i++) {
					binary += String.fromCharCode(bytes[i]);
				}

				const fileBase64 = btoa(binary);
				const prompt = promptRef.current?.value || "";

				const rpc = await getRpcClient();
				const ocrApi = new rpc.OcrApi();
				const result = await ocrApi.processDocument(
					fileBase64,
					droppedFile.name,
					droppedFile.type || "application/octet-stream",
					prompt,
				);

				clearInterval(progressInterval);

				const elapsedMs = performance.now() - t0;

				if (result.success && result.markdown) {
					// Log the raw model response to the browser console
					if (result.rawResponse) {
						console.log("[OCR] Raw model response:", result.rawResponse);
					}

					// Hide any previous error
					$(errorAlertRef).update(<div ref={errorAlertRef} class="hidden" />);

					// Jump to 100%
					updateProgress(100);

					const pageCount = result.pages?.length || 1;
					const pagesInfo =
						pageCount > 1 ? ` (${pageCount} ${t("ocr.pages_processed")})` : "";

					toast({
						category: "success",
						title: t("ocr.success_title"),
						description: `${t("ocr.success_description")}${pagesInfo}`,
					});

					// Short delay then swap to result view
					queueMicrotask(() => {
						$(containerRef).update(
							renderResultView(
								result.markdown!,
								elapsedMs,
								result.pages,
								result.totalRegions,
							),
						);
					});
				} else {
					const errorMsg = result.error || t("ocr.error_description");
					console.error("OCR processing failed:", errorMsg);

					// Restore drop area
					$(containerRef).update(renderUploadView());

					// Show persistent Alert in UI
					$(errorAlertRef).update(
						<div ref={errorAlertRef}>
							<Alert variant="destructive">
								<AlertTitle>{t("ocr.error_title")}</AlertTitle>
								<AlertDescription>{errorMsg}</AlertDescription>
							</Alert>
						</div>,
					);

					toast({
						category: "error",
						title: t("ocr.error_title"),
						description: errorMsg,
					});
				}
			} catch (error) {
				clearInterval(progressInterval);

				// Restore drop area
				$(containerRef).update(renderUploadView());

				const errorMsg =
					error instanceof Error ? error.message : t("common.please_try_again");
				console.error("OCR upload error:", error);

				// Show persistent Alert in UI
				$(errorAlertRef).update(
					<div ref={errorAlertRef}>
						<Alert variant="destructive">
							<AlertTitle>{t("common.unexpected_error")}</AlertTitle>
							<AlertDescription>{errorMsg}</AlertDescription>
						</Alert>
					</div>,
				);

				toast({
					category: "error",
					title: t("common.unexpected_error"),
					description: errorMsg,
				});
			} finally {
				isProcessing = false;
				$(uploadBtnRef).attr("disabled", null as any);
			}
		};

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("ocr.upload_title")}</CardTitle>
					<CardDescription>{t("ocr.upload_description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div class="grid gap-2">
						<Label htmlFor="prompt">{t("ocr.prompt_label")}</Label>
						<textarea
							ref={promptRef}
							id="prompt"
							name="prompt"
							class="textarea min-h-[80px]"
							value={OCR_DEFAULT_PROMPT}
							placeholder={t("ocr.prompt_placeholder")}
						/>
					</div>

					<div ref={dropAreaWrapperRef} class="grid gap-2">
						<Label>{t("ocr.file_label")}</Label>
						<DropArea
							class="min-h-[250px] border-dashed"
							size="md"
							accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
							onDrop={handleDrop}
							onFileSelect={handleFileSelect}
							onDragEnter={() => { }}
							onDragLeave={() => { }}
						>
							{renderDropPlaceholder()}
						</DropArea>
					</div>

					<div ref={errorAlertRef} class="hidden" />
				</CardContent>
				<CardFooter>
					<Button ref={uploadBtnRef} className="w-full" onClick={handleUpload}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="mr-2"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" x2="12" y1="3" y2="15" />
						</svg>
						{t("ocr.upload_button")}
					</Button>
				</CardFooter>
			</Card>
		);
	};

	/** Reusable per-page result panel */
	const PageResult = ({
		markdown,
		regions,
		pageIndex,
	}: {
		markdown: string;
		regions?: Array<Record<string, unknown>>;
		pageIndex: number;
	}) => {
		const regionsJson =
			regions && regions.length > 0 ? JSON.stringify(regions, null, 2) : null;

		return (
			<div class="space-y-4">
				<div class="grid gap-2">
					<Label htmlFor={`result-${pageIndex}`}>{t("ocr.result_label")}</Label>
					<textarea
						id={`result-${pageIndex}`}
						class="textarea min-h-[200px] max-h-[500px] font-mono text-sm overflow-y-auto"
						readOnly
						value={markdown}
					/>
				</div>
				{regionsJson && (
					<div class="grid gap-2">
						<Label htmlFor={`layout-${pageIndex}`}>
							{t("ocr.layout_label")}
						</Label>
						<textarea
							id={`layout-${pageIndex}`}
							class="textarea min-h-[120px] max-h-[300px] font-mono text-xs overflow-y-auto"
							readOnly
							value={regionsJson}
						/>
					</div>
				)}
			</div>
		);
	};

	/** Extract readable text from a page's regions */
	const extractPageText = (page: OcrPage): string => {
		if (typeof page.content === "string") return page.content;
		if (typeof page.markdown === "string") return page.markdown;
		if (!page.regions) return "";
		return page.regions
			.map((r) => r.text || r.content || "")
			.filter(Boolean)
			.join("\n");
	};

	const renderResultView = (
		markdown: string,
		elapsedMs?: number,
		pages?: OcrPage[],
		totalRegions?: number,
	) => {
		const handleProcessAnother = () => {
			droppedFile = null;
			isProcessing = false;
			$(containerRef).update(renderUploadView());
		};

		const elapsedSec = elapsedMs != null ? (elapsedMs / 1000).toFixed(1) : null;
		const pageCount = pages?.length || 0;

		// Flatten all regions across pages
		const allRegions: Array<Record<string, unknown>> = [];
		if (pages) {
			for (const p of pages) {
				if (p.regions) allRegions.push(...p.regions);
			}
		}

		const renderTabs = () => {
			if (!pages || pages.length === 0) {
				// No page data — render flat (no tabs)
				return (
					<PageResult
						markdown={markdown}
						regions={allRegions.length > 0 ? allRegions : undefined}
						pageIndex={0}
					/>
				);
			}

			// Multiple pages — render in tabs
			return (
				<Tabs defaultValue="all" className="w-full">
					<TabsList>
						<TabsTrigger value="all">{t("ocr.tab_all")}</TabsTrigger>
						{pages.map((_, i) => (
							<TabsTrigger key={`tab-${i}`} value={`page-${i}`}>
								{t("ocr.tab_page")} {String(i + 1)}
							</TabsTrigger>
						))}
					</TabsList>
					<TabsContent value="all">
						<PageResult
							markdown={markdown}
							regions={allRegions.length > 0 ? allRegions : undefined}
							pageIndex={-1}
						/>
					</TabsContent>
					{pages.map((page, i) => {
						const pageText =
							extractPageText(page) || `[${t("ocr.tab_page")} ${i + 1}]`;
						return (
							<TabsContent key={`content-${i}`} value={`page-${i}`}>
								<PageResult
									markdown={pageText}
									regions={page.regions}
									pageIndex={i}
								/>
							</TabsContent>
						);
					})}
				</Tabs>
			);
		};

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("ocr.result_title")}</CardTitle>
					<CardDescription>{t("ocr.result_description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{renderTabs()}
					<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
						{elapsedSec && (
							<span>
								{t("ocr.stats_time")}: <strong>{elapsedSec}s</strong>
							</span>
						)}
						{pageCount > 0 && (
							<span>
								{t("ocr.stats_pages")}: <strong>{String(pageCount)}</strong>
							</span>
						)}
						{totalRegions != null && totalRegions > 0 && (
							<span>
								{t("ocr.stats_regions")}:{" "}
								<strong>{String(totalRegions)}</strong>
							</span>
						)}
						<span>
							{t("ocr.stats_chars")}: <strong>{String(markdown.length)}</strong>
						</span>
					</div>
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						onClick={handleProcessAnother}
					>
						{t("ocr.process_another")}
					</Button>
					<Button
						variant="outline"
						className="flex-1"
						onClick={() => {
							navigator.clipboard.writeText(markdown).then(
								() => toast({ category: "success", title: t("common.copied") }),
								() => toast({ category: "error", title: t("ocr.copy_failed") }),
							);
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="mr-2"
						>
							<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
							<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
						</svg>
						{t("ocr.copy_result")}
					</Button>
					<Button
						className="flex-1"
						onClick={() => {
							const regionsJson = allRegions.length > 0 ? JSON.stringify(allRegions, null, 2) : "[]";
							ocrResultStore.set({
								markdown,
								layoutJson: regionsJson,
								imageBlobUrl: currentObjectUrl || undefined,
							});
							Router.navigate("/transform");
						}}
					>
						{t("ocr.next_transform")}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="ml-2"
						>
							<path d="M5 12h14" />
							<path d="m12 5 7 7-7 7" />
						</svg>
					</Button>
				</CardFooter>
			</Card>
		);
	};

	return <div ref={containerRef}>{renderUploadView()}</div>;
}
