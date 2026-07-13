import type { PDFPageProxy, TextItem } from "pdfjs-dist/types/src/display/api";

export interface Mare2BriefingStageCandidate {
	stageNumber: number;
	pageNumber: number;
	courseType?: string;
	minRounds?: number;
	maxPoints?: number;
	imageBlob: Blob;
}

export async function parseMare2BriefingPdf(
	file: File,
): Promise<Mare2BriefingStageCandidate[]> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		"pdfjs-dist/legacy/build/pdf.worker.mjs",
		import.meta.url,
	).toString();
	const data = await file.arrayBuffer();
	const pdf = await pdfjs.getDocument({ data }).promise;
	const candidates: Mare2BriefingStageCandidate[] = [];

	for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
		const page = await pdf.getPage(pageNumber);
		const text = await extractPageText(page);
		const metadata = parseBriefingStageMetadata(text);

		if (!metadata) continue;

		candidates.push({
			stageNumber: candidates.length + 1,
			pageNumber,
			...metadata,
			imageBlob: await renderStageDiagramCrop(page),
		});
	}

	if (!candidates.length) {
		throw new Error("No Mare2 stage briefing pages found in this PDF.");
	}

	return candidates;
}

async function extractPageText(page: PDFPageProxy): Promise<string> {
	const content = await page.getTextContent();
	const textItems = content.items.filter(
		(item): item is TextItem => "str" in item && item.str.trim().length > 0,
	);
	return textItems
		.map((item) => item.str)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

function parseBriefingStageMetadata(
	text: string,
):
	| Omit<
			Mare2BriefingStageCandidate,
			"stageNumber" | "pageNumber" | "imageBlob"
	  >
	| undefined {
	if (
		!/Tipo:/i.test(text) ||
		!/Minimo numero di colpi richiesti:/i.test(text) ||
		!/Massimi punti possibili:/i.test(text)
	) {
		return undefined;
	}

	return {
		courseType: text
			.match(/Tipo:\s*([^:]+?)\s+Bersagli:/i)?.[1]
			?.trim()
			.replace(/\s+/g, " "),
		minRounds: parseNumberAfterLabel(
			text,
			/Minimo numero di colpi richiesti:\s*(\d+)/i,
		),
		maxPoints: parseNumberAfterLabel(text, /Massimi punti possibili:\s*(\d+)/i),
	};
}

function parseNumberAfterLabel(
	text: string,
	pattern: RegExp,
): number | undefined {
	const value = text.match(pattern)?.[1];
	return value ? Number.parseInt(value, 10) : undefined;
}

async function renderStageDiagramCrop(page: PDFPageProxy): Promise<Blob> {
	const scale = 1.6;
	const viewport = page.getViewport({ scale });
	const fullCanvas = document.createElement("canvas");
	const fullContext = fullCanvas.getContext("2d");
	if (!fullContext) throw new Error("canvas-unavailable");

	fullCanvas.width = Math.ceil(viewport.width);
	fullCanvas.height = Math.ceil(viewport.height);
	await page.render({
		canvas: fullCanvas,
		canvasContext: fullContext,
		viewport,
	}).promise;

	const cropY = Math.round(fullCanvas.height * 0.06);
	const cropHeight = Math.round(fullCanvas.height * 0.52);
	const roughCrop = createCanvas(fullCanvas.width, cropHeight);
	const roughCropContext = getCanvasContext(roughCrop);
	roughCropContext.drawImage(
		fullCanvas,
		0,
		cropY,
		fullCanvas.width,
		cropHeight,
		0,
		0,
		roughCrop.width,
		roughCrop.height,
	);

	const contentBox = findNonWhiteBounds(roughCrop, 18);
	const trimmedCanvas = createCanvas(contentBox.width, contentBox.height);
	getCanvasContext(trimmedCanvas).drawImage(
		roughCrop,
		contentBox.x,
		contentBox.y,
		contentBox.width,
		contentBox.height,
		0,
		0,
		contentBox.width,
		contentBox.height,
	);

	const outputCanvas = resizeCanvasToMaxWidth(trimmedCanvas, 400);
	return canvasToBlob(outputCanvas, "image/webp", 0.82).catch(() =>
		canvasToBlob(outputCanvas, "image/png"),
	);
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width));
	canvas.height = Math.max(1, Math.round(height));
	return canvas;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const context = canvas.getContext("2d");
	if (!context) throw new Error("canvas-unavailable");
	return context;
}

function findNonWhiteBounds(
	canvas: HTMLCanvasElement,
	padding: number,
): { x: number; y: number; width: number; height: number } {
	const context = getCanvasContext(canvas);
	const { data, width, height } = context.getImageData(
		0,
		0,
		canvas.width,
		canvas.height,
	);
	let minX = width;
	let minY = height;
	let maxX = 0;
	let maxY = 0;

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = (y * width + x) * 4;
			if (
				isMeaningfulPixel(
					data[index],
					data[index + 1],
					data[index + 2],
					data[index + 3],
				)
			) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}

	if (minX > maxX || minY > maxY) return { x: 0, y: 0, width, height };

	const x = Math.max(0, minX - padding);
	const y = Math.max(0, minY - padding);
	const right = Math.min(width, maxX + padding);
	const bottom = Math.min(height, maxY + padding);
	return { x, y, width: right - x, height: bottom - y };
}

function resizeCanvasToMaxWidth(
	canvas: HTMLCanvasElement,
	maxWidth: number,
): HTMLCanvasElement {
	if (canvas.width <= maxWidth) return canvas;
	const ratio = maxWidth / canvas.width;
	const resizedCanvas = createCanvas(maxWidth, canvas.height * ratio);
	getCanvasContext(resizedCanvas).drawImage(
		canvas,
		0,
		0,
		resizedCanvas.width,
		resizedCanvas.height,
	);
	return resizedCanvas;
}

function isMeaningfulPixel(
	red: number,
	green: number,
	blue: number,
	alpha: number,
): boolean {
	return alpha > 0 && !(red > 245 && green > 245 && blue > 245);
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	mimeType: string,
	quality?: number,
): Promise<Blob> {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("stage-crop-failed"))),
			mimeType,
			quality,
		);
	});
}
