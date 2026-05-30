import { createStore } from "defuss";

export interface OcrResultData {
	markdown: string;
	layoutJson: string;
	imageBlobUrl?: string;
	imageWidth?: number;
	imageHeight?: number;
}

/** Shared store to pass OCR results from /ocr to /transform. */
export const ocrResultStore = createStore<OcrResultData>({
	markdown: "",
	layoutJson: "",
	imageBlobUrl: "",
	imageWidth: 0,
	imageHeight: 0,
});
