import { Button } from "defuss-shadcn";
import { t } from "../../i18n";

export interface CopyValueButtonProps {
	value: string;
	label: string;
}

export function CopyValueButton({ value, label }: CopyValueButtonProps) {
	const copyBtnId = `copy-btn-${Math.random().toString(36).substr(2, 9)}`;

	const copyToClipboard = () => {
		navigator.clipboard
			.writeText(value)
			.then(() => {
				const btn = document.getElementById(copyBtnId);
				if (btn) {
					btn.classList.add("copied");
					setTimeout(() => btn.classList.remove("copied"), 2000);
				}
			})
			.catch(console.error);
	};

	return (
		<Button
			id={copyBtnId}
			type="button"
			variant="ghost"
			size="icon"
			className="size-7 text-muted-foreground rounded-md hover:text-foreground group"
			onClick={copyToClipboard}
			aria-label={`${t("login.copy")} ${label}`}
			title={`${t("login.copy")} ${label}`}
		>
			<div class="group-[.copied]:hidden">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
			</div>
			<div class="hidden group-[.copied]:block">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
			</div>
		</Button>
	);
}
