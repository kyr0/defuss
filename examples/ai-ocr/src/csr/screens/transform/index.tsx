import { $, createRef, createStore, Router, type Props, type RouteProps } from "defuss";
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
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
	toast,
} from "defuss-shadcn";
import { t } from "../../i18n";
import { ocrResultStore } from "../../lib/ocr-store.js";
import { Layout2D } from "../../components/layout-2d.js";

const TRANSFORM_METHODS = [
	{ id: "invoice", label: "Invoice JSON schema transform" },
] as const;

const INVOICE_SCHEMA_PROMPT = `Return ONLY valid JSON matching structure:
{
  "Invoice": {
    "InvoiceNumber": "",
    "InvoiceDate": "YYYY-MM-DD",
    "DueDate": "YYYY-MM-DD",
    "Seller": {
      "Name": "",
      "StreetName": "",
      "City": "",
      "PostalCode": "",
      "CountryCode": "DE",
      "TaxIdentificationNumber": "",
      "TaxVATNumber": ""
    },
    "Buyer": {
      "Name": "",
      "StreetName": "",
      "City": "",
      "PostalCode": "",
      "CountryCode": "DE",
      "TaxIdentificationNumber": "",
      "TaxVATNumber": ""
    },
    "DocumentCurrencyCode": "EUR",
    "IBAN": "",
    "BIC": "",
    "BankName": "",
    "PaymentReceiver": "",
    "PaymentReference": "",
    "Tax": [
      {
        "TaxTypeCode": "VAT",
        "TaxCategoryCode": "S",
        "TaxPercentage": 19.0,
        "TaxAmount": 0.0
      }
    ],
    "MonetarySummation": {
      "LineTotal": 0.0,
      "TaxExclusiveAmount": 0.0,
      "TaxInclusiveAmount": 0.0,
      "PayableAmount": 0.0
    },
    "InvoiceLines": [
      {
        "LineID": "1",
        "ProductName": "",
        "Unit": "HUR",
        "Quantity": 0.0,
        "UnitPrice": 0.0,
        "LineTotalAmount": 0.0,
        "TaxCategoryCode": "S",
        "TaxPercentage": 0.0
      }
    ]
  }
}`;

const LLM_BASE_URL = "http://127.0.0.1:8430/v1";
const LLM_MODEL = "prism-ml/Bonsai-8B-mlx-1bit";

async function callLlm(markdownText: string, layoutJson: string): Promise<string> {
	const userContent = `Here is the OCR-extracted document content:\n\n---\n${markdownText}\n---\n\nLayout JSON:\n${layoutJson}\n\n${INVOICE_SCHEMA_PROMPT}`;

	const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: LLM_MODEL,
			messages: [
				{
					role: "system",
					content: "You are a document data extraction assistant. Extract structured data from OCR text and return only valid JSON.",
				},
				{ role: "user", content: userContent },
			],
			temperature: 0.1,
			max_tokens: 4096,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`LLM request failed (${response.status}): ${errorText}`);
	}

	const data = await response.json();
	const content = data?.choices?.[0]?.message?.content;

	if (!content) {
		throw new Error("LLM returned empty response");
	}

	return content;
}

export function TransformScreen() {
	const containerRef = createRef<HTMLDivElement>();
	let isProcessing = false;

	const { markdown, layoutJson } = ocrResultStore.value;

	if (!markdown) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("transform.title")}</CardTitle>
					<CardDescription>{t("transform.no_data_description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert>
						<AlertTitle>{t("transform.no_data_title")}</AlertTitle>
						<AlertDescription>{t("transform.no_data_hint")}</AlertDescription>
					</Alert>
				</CardContent>
				<CardFooter>
					<Button onClick={() => Router.navigate("/ocr")}>{t("transform.back_to_ocr")}</Button>
				</CardFooter>
			</Card>
		);
	}

	const renderMethodSelect = () => {
		const resultAreaRef = createRef<HTMLDivElement>();
		const progressWrapperRef = createRef<HTMLDivElement>();
		const transformBtnRef = createRef<HTMLButtonElement>();

		const progressBarRef = createRef<HTMLDivElement>();
		const progressPercentRef = createRef<HTMLParagraphElement>();

		const updateProgress = (value: number) => {
			if (progressBarRef.current) {
				progressBarRef.current.style.width = `${value}%`;
			}
			if (progressPercentRef.current) {
				progressPercentRef.current.textContent = `${value}%`;
			}
		};

		const renderProgressView = () => (
			<div class="flex flex-col items-center justify-center gap-4 min-h-[120px] w-full rounded-lg border border-dashed p-6">
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
					class="text-primary animate-pulse"
				>
					<path d="M12 3v3" />
					<path d="M18.5 5.5l-2.1 2.1" />
					<path d="M21 12h-3" />
					<path d="M18.5 18.5l-2.1-2.1" />
					<path d="M12 21v-3" />
					<path d="M5.5 18.5l2.1-2.1" />
					<path d="M3 12h3" />
					<path d="M5.5 5.5l2.1 2.1" />
				</svg>
				<p class="text-sm font-medium text-foreground">
					{t("transform.processing_label")}
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
		);

		const handleTransform = async () => {
			if (isProcessing) return;
			isProcessing = true;

			$(progressWrapperRef).update(
				<div ref={progressWrapperRef}>{renderProgressView()}</div>,
			);
			$(transformBtnRef).attr("disabled", "true");

			let progress = 5;
			let factor = 0.12;
			setTimeout(() => updateProgress(progress), 50);

			const progressInterval = setInterval(() => {
				progress = Math.min(progress + (100 - progress) * factor, 99.5);
				factor *= 0.88;
				updateProgress(Math.round(progress));
			}, 600);

			const t0 = performance.now();

			try {
				const result = await callLlm(markdown, layoutJson);
				clearInterval(progressInterval);
				updateProgress(100);

				const elapsedMs = performance.now() - t0;
				const elapsedSec = (elapsedMs / 1000).toFixed(1);

				// Try to pretty-print if valid JSON
				let formatted = result;
				try {
					formatted = JSON.stringify(JSON.parse(result), null, 2);
				} catch {
					// Keep raw if not valid JSON
				}

				toast({
					category: "success",
					title: t("transform.success_title"),
					description: `${t("transform.success_description")} (${elapsedSec}s)`,
				});

				queueMicrotask(() => {
					$(containerRef).update(renderResultView(formatted, elapsedMs));
				});
			} catch (error) {
				clearInterval(progressInterval);

				const errorMsg =
					error instanceof Error ? error.message : t("common.please_try_again");
				console.error("Transform error:", error);

				$(progressWrapperRef).update(<div ref={progressWrapperRef} />);

				toast({
					category: "error",
					title: t("transform.error_title"),
					description: errorMsg,
				});
			} finally {
				isProcessing = false;
				$(transformBtnRef).attr("disabled", null as any);
			}
		};

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("transform.title")}</CardTitle>
					<CardDescription>{t("transform.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Tabs defaultValue="source" className="w-full">
						<TabsList>
							<TabsTrigger value="source">{t("transform.tab_source")}</TabsTrigger>
							<TabsTrigger value="layout">{t("transform.tab_layout")}</TabsTrigger>
							{ocrResultStore.value.imageBlobUrl && (
								<TabsTrigger value="layout2d">Layout 2D</TabsTrigger>
							)}
						</TabsList>
						<TabsContent value="source">
							<div class="grid gap-2">
								<Label htmlFor="source-md">{t("transform.source_label")}</Label>
								<textarea
									id="source-md"
									class="textarea min-h-[150px] max-h-[300px] font-mono text-sm overflow-y-auto"
									readOnly
									value={markdown}
								/>
							</div>
						</TabsContent>
						<TabsContent value="layout">
							<div class="grid gap-2">
								<Label htmlFor="source-layout">{t("transform.layout_label")}</Label>
								<textarea
									id="source-layout"
									class="textarea min-h-[150px] max-h-[300px] font-mono text-xs overflow-y-auto"
									readOnly
									value={layoutJson}
								/>
							</div>
						</TabsContent>
						{ocrResultStore.value.imageBlobUrl && (
							<TabsContent value="layout2d">
								<Layout2D
									imageBlobUrl={ocrResultStore.value.imageBlobUrl!}
									regions={JSON.parse(layoutJson || "[]")}
								/>
							</TabsContent>
						)}
					</Tabs>

					<div class="grid gap-2">
						<Label htmlFor="transform-method">{t("transform.method_label")}</Label>
						<select id="transform-method" class="select">
							{TRANSFORM_METHODS.map((m) => (
								<option key={m.id} value={m.id}>
									{m.label}
								</option>
							))}
						</select>
					</div>

					<div class="grid gap-2">
						<Label>{t("transform.model_label")}</Label>
						<p class="text-sm text-muted-foreground font-mono">{LLM_MODEL}</p>
					</div>

					<div ref={progressWrapperRef} />
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button variant="outline" className="flex-1" onClick={() => Router.navigate("/ocr")}>
						{t("common.back")}
					</Button>
					<Button ref={transformBtnRef} className="flex-1" onClick={handleTransform}>
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
							<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
							<path d="M3 3v5h5" />
							<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
							<path d="M16 16h5v5" />
						</svg>
						{t("transform.run_button")}
					</Button>
				</CardFooter>
			</Card>
		);
	};

	const renderResultView = (jsonResult: string, elapsedMs: number) => {
		const elapsedSec = (elapsedMs / 1000).toFixed(1);

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("transform.result_title")}</CardTitle>
					<CardDescription>{t("transform.result_description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div class="grid gap-2">
						<Label htmlFor="transform-result">{t("transform.result_label")}</Label>
						<textarea
							id="transform-result"
							class="textarea min-h-[300px] max-h-[600px] font-mono text-sm overflow-y-auto"
							readOnly
							value={jsonResult}
						/>
					</div>
					<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
						<span>
							{t("transform.stats_time")}: <strong>{elapsedSec}s</strong>
						</span>
						<span>
							{t("transform.stats_chars")}: <strong>{String(jsonResult.length)}</strong>
						</span>
					</div>
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						onClick={() => {
							$(containerRef).update(renderMethodSelect());
						}}
					>
						{t("transform.try_again")}
					</Button>
					<Button
						className="flex-1"
						onClick={() => {
							navigator.clipboard.writeText(jsonResult).then(
								() => toast({ category: "success", title: t("common.copied") }),
								() => toast({ category: "error", title: t("transform.copy_failed") }),
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
						{t("transform.copy_result")}
					</Button>
				</CardFooter>
			</Card>
		);
	};

	return <div ref={containerRef}>{renderMethodSelect()}</div>;
}
