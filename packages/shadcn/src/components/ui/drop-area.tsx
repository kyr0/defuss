import type { CSSProperties, ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

type DropAreaSize = "sm" | "md";

const sizeStyles: Record<DropAreaSize, string> = {
	sm: "px-4 py-3 gap-1",
	md: "px-6 py-8 gap-2",
};

export type DropAreaProps = Omit<
	ElementProps<HTMLDivElement>,
	"size" | "style"
> & {
	size?: DropAreaSize;
	style?: Partial<CSSProperties>;
	accept?: string;
	onDrop?: (event: DragEvent) => void;
	onDragEnter?: (event: DragEvent) => void;
	onDragLeave?: (event: DragEvent) => void;
	onFileSelect?: (files: FileList) => void;
};

export const DropArea: FC<DropAreaProps> = ({
	class: className,
	size = "md",
	children,
	style,
	accept,
	ref = createRef() as Ref<HTMLDivElement>,
	onDrop,
	onDragEnter,
	onDragLeave,
	onFileSelect,
	...props
}) => {
	const dropAreaRef = ref || createRef<HTMLDivElement>();
	const fileInputRef = createRef<HTMLInputElement>();

	const attachNativeDragHandlers = () => {
		const el = dropAreaRef.current;
		if (!el) return;

		el.addEventListener("dragover", (e) => {
			e.preventDefault();
		});

		el.addEventListener("dragenter", (e) => {
			e.preventDefault();
			onDragEnter?.(e);
		});

		el.addEventListener("dragleave", (e) => {
			onDragLeave?.(e);
		});

		el.addEventListener("drop", (e) => {
			e.preventDefault();
			onDrop?.(e);
			if (e.dataTransfer?.files?.length) {
				onFileSelect?.(e.dataTransfer.files);
			}
		});

		el.addEventListener("click", (e) => {
			// Don't open file picker if the click target is an interactive element
			const target = e.target as HTMLElement;
			if (target.closest("button, a, input, select, textarea")) return;

			fileInputRef.current?.click();
		});
	};

	const handleFileInput = () => {
		const files = fileInputRef.current?.files;
		if (files?.length) {
			onFileSelect?.(files);
		}
	};

	return (
		<div
			role="button"
			ref={dropAreaRef}
			data-slot="drop-area"
			class={cn(
				"text-muted-foreground flex flex-col items-center justify-center rounded-lg border-0 transition-colors hover:bg-muted/50 p-6",
				sizeStyles[size],
				className,
			)}
			style={{
				border: "1px dashed var(--color-border)",
				borderRadius: "var(--radius-lg)",
				cursor: "pointer",
				...style,
			}}
			{...props}
			onMount={attachNativeDragHandlers}
		>
			{children}
			<input
				ref={fileInputRef}
				type="file"
				accept={accept}
				class="hidden"
				onChange={handleFileInput}
				tabIndex={-1}
			/>
		</div>
	);
};
