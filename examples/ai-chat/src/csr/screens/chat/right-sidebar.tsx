import { createRef } from "defuss";
import { Input, Label, Separator } from "defuss-shadcn";
import { chatStore, saveSettingsToStorage } from "../../lib/chat-store";
import type { ChatSettings } from "../../../models/chat";
import { t } from "../../i18n";

export function RightSidebar() {
	const formRef = createRef<HTMLFormElement>();
	const containerRef = createRef<HTMLDivElement>();

	const tempLabelRef = createRef<HTMLSpanElement>();
	const topKLabelRef = createRef<HTMLSpanElement>();
	const topPLabelRef = createRef<HTMLSpanElement>();
	const repetitionLabelRef = createRef<HTMLSpanElement>();
	const presLabelRef = createRef<HTMLSpanElement>();

	const toggleCollapse = () => {
		const el = containerRef.current;
		if (el) el.classList.toggle("collapsed");
	};

	// Expose toggle via a global so the chat header can call it
	(window as any).__toggleRightSidebar = toggleCollapse;

	const updateSliderLabel = (input: HTMLInputElement) => {
		const name = input.name;
		const val = input.value;
		if (name === "temperature" && tempLabelRef.current) tempLabelRef.current.textContent = `(${val})`;
		if (name === "topK" && topKLabelRef.current) topKLabelRef.current.textContent = `(${val})`;
		if (name === "topP" && topPLabelRef.current) topPLabelRef.current.textContent = `(${val})`;
		if (name === "repetitionPenalty" && repetitionLabelRef.current) repetitionLabelRef.current.textContent = `(${val})`;
		if (name === "presencePenalty" && presLabelRef.current) presLabelRef.current.textContent = `(${val})`;
	};

	const saveSettings = () => {
		const form = formRef.current;
		if (!form) return;

		const fd = new FormData(form);
		const settings: ChatSettings = {
			baseUrl: (fd.get("baseUrl") as string) || "http://localhost:8430",
			apiKey: (fd.get("apiKey") as string) || "",
			model: (fd.get("model") as string) || "kyr0/zaya1-base-8b-4bit-MLX",
			systemPrompt: (fd.get("systemPrompt") as string) || "You are a helpful assistant.",
			temperature: parseFloat((fd.get("temperature") as string) || "0.5"),
			maxTokens: parseInt((fd.get("maxTokens") as string) || "8192", 10),
			topK: parseInt((fd.get("topK") as string) || "20", 10),
			topP: parseFloat((fd.get("topP") as string) || "0.9"),
			repetitionPenalty: parseFloat((fd.get("repetitionPenalty") as string) || "1.0"),
			presencePenalty: parseFloat((fd.get("presencePenalty") as string) || "0"),
			enableThinking: (fd.get("enableThinking") as string) === "on",
		};

		chatStore.set({ ...chatStore.value, settings });
		saveSettingsToStorage(settings);
	};

	const onSliderInput = (e: Event) => {
		const input = e.target as HTMLInputElement;
		updateSliderLabel(input);
		saveSettings();
	};

	const s = chatStore.value.settings;

	return (
		<div ref={containerRef} class="chat-sidebar-right flex flex-col h-full border-l bg-sidebar text-sidebar-foreground">
			<div class="flex items-center px-2 py-1 border-b h-10">
				<h2 class="font-semibold text-sm sidebar-title">{t("settings.title")}</h2>
			</div>
			<div class="sidebar-content flex-1 overflow-y-auto p-3 scrollbar">
				<form ref={formRef} class="grid gap-4" onChange={saveSettings}>
					<div class="grid gap-1.5">
						<Label htmlFor="baseUrl" className="text-xs font-medium">{t("settings.base_url")}</Label>
						<Input id="baseUrl" name="baseUrl" type="text" value={s.baseUrl} className="h-8 text-xs" placeholder="http://localhost:8430" />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="apiKey" className="text-xs font-medium">{t("settings.api_key")}</Label>
						<Input id="apiKey" name="apiKey" type="password" value={s.apiKey} className="h-8 text-xs" placeholder="sk-..." />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="model" className="text-xs font-medium">{t("settings.model")}</Label>
						<Input id="model" name="model" type="text" value={s.model} className="h-8 text-xs" placeholder="kyr0/zaya1-base-8b-4bit-MLX" />
					</div>

					<div class="flex items-center gap-2">
						<input id="enableThinking" name="enableThinking" type="checkbox" class="input" checked={s.enableThinking} />
						<Label htmlFor="enableThinking" className="text-xs font-medium cursor-pointer">{t("settings.enable_thinking")}</Label>
					</div>

					<Separator />

					<div class="grid gap-1.5">
						<Label htmlFor="systemPrompt" className="text-xs font-medium">{t("settings.system_prompt")}</Label>
						<textarea id="systemPrompt" name="systemPrompt" class="textarea text-xs min-h-[80px]" placeholder={t("settings.system_prompt_placeholder")}>{s.systemPrompt}</textarea>
					</div>

					<Separator />

					<div class="grid gap-1.5">
						<Label htmlFor="temperature" className="text-xs font-medium">{t("settings.temperature")} <span ref={tempLabelRef} class="text-muted-foreground">({String(s.temperature)})</span></Label>
						<input id="temperature" name="temperature" type="range" min="0" max="1" step="0.005" value={String(s.temperature)} class="w-full accent-primary" onInput={onSliderInput} />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="maxTokens" className="text-xs font-medium">{t("settings.max_tokens")}</Label>
						<Input id="maxTokens" name="maxTokens" type="number" value={String(s.maxTokens)} className="h-8 text-xs" min="1" max="128000" />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="topK" className="text-xs font-medium">{t("settings.top_k")} <span ref={topKLabelRef} class="text-muted-foreground">({String(s.topK)})</span></Label>
						<input id="topK" name="topK" type="range" min="1" max="10" step="1" value={String(s.topK)} class="w-full accent-primary" onInput={onSliderInput} />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="topP" className="text-xs font-medium">{t("settings.top_p")} <span ref={topPLabelRef} class="text-muted-foreground">({String(s.topP)})</span></Label>
						<input id="topP" name="topP" type="range" min="0.7" max="1" step="0.005" value={String(s.topP)} class="w-full accent-primary" onInput={onSliderInput} />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="repetitionPenalty" className="text-xs font-medium">{t("settings.repetition_penalty")} <span ref={repetitionLabelRef} class="text-muted-foreground">({String(s.repetitionPenalty)})</span></Label>
						<input id="repetitionPenalty" name="repetitionPenalty" type="range" min="1" max="2" step="0.005" value={String(s.repetitionPenalty)} class="w-full accent-primary" onInput={onSliderInput} />
					</div>

					<div class="grid gap-1.5">
						<Label htmlFor="presencePenalty" className="text-xs font-medium">{t("settings.presence_penalty")} <span ref={presLabelRef} class="text-muted-foreground">({String(s.presencePenalty)})</span></Label>
						<input id="presencePenalty" name="presencePenalty" type="range" min="0" max="2" step="0.005" value={String(s.presencePenalty)} class="w-full accent-primary" onInput={onSliderInput} />
					</div>
				</form>
			</div>
		</div>
	);
}
