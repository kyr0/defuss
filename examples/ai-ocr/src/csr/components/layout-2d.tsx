import { createRef } from "defuss";

export interface LayoutRegion {
	bbox_2d: [number, number, number, number]; // [x0, y0, x1, y1]
	content: string;
	index: number;
	label: string;
	polygon?: [number, number][];
}

export interface Layout2DProps {
	imageBlobUrl: string;
	regions: LayoutRegion[];
}

/**
 * Renders the original image with absolute-positioned div overlays showing
 * red bbox rectangles and OCR text inside each box.
 * Bbox coordinates map 1:1 to rendered pixels.
 */
export function Layout2D({ imageBlobUrl, regions }: Layout2DProps) {
	const imgRef = createRef<HTMLImageElement>();

	const onMount = () => {
		const img = imgRef.current;
		if (!img) return;

		// Set image to exact natural pixel dimensions
		img.style.width = `${img.naturalWidth}px`;
		img.style.height = `${img.naturalHeight}px`;

		// Force inner container to natural image size so outer container scrolls
		const inner = img.parentElement;
		if (inner) {
			inner.style.width = `${img.naturalWidth}px`;
			inner.style.height = `${img.naturalHeight}px`;
		}

		// Bbox coords are normalized to 1000×1000 — scale to natural pixel dimensions
		const scaleX = img.naturalWidth / 1000;
		const scaleY = img.naturalHeight / 1000;

		// Position all overlay divs using scaled coordinates
		const boxes = img.parentElement?.querySelectorAll<HTMLElement>(".bbox-box");
		if (!boxes) return;

		boxes.forEach((box, i) => {
			const r = regions[i];
			if (!r) return;
			const [x0, y0, x1, y1] = r.bbox_2d;
			const left = x0 * scaleX;
			const top = y0 * scaleY;
			const width = (x1 - x0) * scaleX;
			const height = (y1 - y0) * scaleY;

			box.style.left = `${left}px`;
			box.style.top = `${top}px`;
			box.style.width = `${width}px`;
			box.style.height = `${height}px`;

			const fontSize = Math.max(8, Math.min(height * 0.8, 24));
			box.style.fontSize = `${fontSize}px`;
			box.textContent = r.content;
		});
	};

	return (
		<div
			onMount={onMount}
			class="overflow-auto rounded border w-full"
		>
			<div class="relative inline-block">
				<img
					ref={imgRef}
					src={imageBlobUrl}
					alt="OCR source"
					class="block flex-shrink-0"
				/>
				{regions.map((region, i) => (
					<div
						key={`box-${i}`}
						class="bbox-box absolute"
						style="
	             left: 0;
	             top: 0;
	             border: 1.5px solid red;
	             background: rgba(255, 0, 0, 0.1);
	             color: white;
	             text-shadow: -0.5px -0.5px 0 black, 0.5px -0.5px 0 black, -0.5px 0.5px 0 black, 0.5px 0.5px 0 black;
	             line-height: 1.1;
	             padding: 1px 2px;
	             white-space: pre-wrap;
	             word-break: break-word;
	             pointer-events: none;
	             overflow: hidden;
	           "
						data-index={region.index}
					>
						{region.content}
					</div>
				))}
			</div>
		</div>
	);
}
