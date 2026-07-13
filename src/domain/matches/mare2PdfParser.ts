import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type {
	PractiscoreCompetitor,
	PractiscoreMatchSnapshot,
	PractiscoreStage,
	PractiscoreStageScore,
} from "./practiscoreTypes";

const ITALIAN_MONTHS: Record<string, string> = {
	gen: "01",
	feb: "02",
	mar: "03",
	apr: "04",
	mag: "05",
	giu: "06",
	lug: "07",
	ago: "08",
	set: "09",
	ott: "10",
	nov: "11",
	dic: "12",
};

export async function parseMare2PdfSnapshot(
	file: File,
): Promise<PractiscoreMatchSnapshot> {
	const text = await extractPdfText(file);
	return parseMare2TextSnapshot(text, file.name);
}

export function parseMare2TextSnapshot(
	text: string,
	sourceFileName = "mare2-results.pdf",
): PractiscoreMatchSnapshot {
	const normalizedText = text.replace(/\r\n?/g, "\n");
	const lines = normalizedText.split("\n");
	const matchName = findMatchName(lines);
	const matchDate = findPrintedDate(lines);
	const importedAt = new Date().toISOString();
	const practiscoreMatchId = `mare2:${hashText(`${matchName}:${matchDate}:${normalizedText.length}`)}`;
	const competitors: PractiscoreCompetitor[] = [];
	const scores: PractiscoreStageScore[] = [];
	const stageBestPoints = new Map<string, number>();

	let currentCompetitor: PractiscoreCompetitor | undefined;

	for (const line of lines) {
		const competitor = parseCompetitorLine(line);
		if (competitor) {
			currentCompetitor = competitor;
			competitors.push(competitor);
			continue;
		}

		const stageScore = currentCompetitor
			? parseStageScoreLine(line, currentCompetitor.internalMemberId)
			: undefined;
		if (stageScore) {
			scores.push(stageScore);
			const currentMax = stageBestPoints.get(stageScore.internalStageId) ?? 0;
			stageBestPoints.set(
				stageScore.internalStageId,
				Math.max(currentMax, stageScore.finalScore ?? 0),
			);
		}
	}

	if (!competitors.length || !scores.length) {
		throw new Error("No Mare2 score verification data found in this PDF.");
	}

	const stages: PractiscoreStage[] = [...stageBestPoints.entries()]
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([stageId, bestPoints]) => {
			const minRounds = bestPoints > 0 ? Math.ceil(bestPoints / 5) : undefined;
			return {
				internalStageId: stageId,
				name: `Stage ${stageId}`,
				maxPoints: minRounds ? minRounds * 5 : undefined,
				minRounds,
			};
		});

	return {
		practiscoreMatchId,
		importedAt,
		sourceFileName,
		match: {
			internalMatchId: practiscoreMatchId,
			name: matchName,
			date: matchDate,
		},
		stages,
		competitors,
		scores,
		rawXml: { MARE2_TEXT: normalizedText },
	};
}

async function extractPdfText(file: File): Promise<string> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		"pdfjs-dist/legacy/build/pdf.worker.mjs",
		import.meta.url,
	).toString();
	const data = await file.arrayBuffer();
	const pdf = await pdfjs.getDocument({ data }).promise;
	const pageTexts: string[] = [];

	for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
		const page = await pdf.getPage(pageNumber);
		const content = await page.getTextContent();
		const textItems = content.items.filter(
			(item): item is TextItem => "str" in item && item.str.trim().length > 0,
		);
		const rows = new Map<number, TextItem[]>();

		for (const item of textItems) {
			const y = Math.round(item.transform[5]);
			rows.set(y, [...(rows.get(y) ?? []), item]);
		}

		const pageText = [...rows.entries()]
			.sort(([a], [b]) => b - a)
			.map(([, rowItems]) =>
				rowItems
					.sort((a, b) => a.transform[4] - b.transform[4])
					.map((item) => item.str)
					.join(" ")
					.replace(/\s+/g, " ")
					.trim(),
			)
			.join("\n");

		pageTexts.push(pageText);
	}

	return pageTexts.join("\n");
}

function findMatchName(lines: string[]): string {
	const titleIndex = lines.findIndex(
		(line) => line.trim().toLowerCase() === "score verification by competitor",
	);
	const matchName = titleIndex >= 0 ? lines[titleIndex + 1]?.trim() : undefined;
	return matchName || "Mare2 match results";
}

function findPrintedDate(lines: string[]): string {
	const printedLine = lines.find((line) =>
		/Printed\s+\d{1,2}\s+\p{L}{3}\s+\d{4}/iu.test(line),
	);
	const match = printedLine?.match(
		/Printed\s+(\d{1,2})\s+(\p{L}{3})\s+(\d{4})/iu,
	);
	if (!match) return new Date().toISOString().slice(0, 10);

	const [, day, monthName, year] = match;
	const month = ITALIAN_MONTHS[monthName.toLowerCase()] ?? "01";
	return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseCompetitorLine(line: string): PractiscoreCompetitor | undefined {
	const match = line.match(
		/^\s*(\d+)\s+(.+?)\s+DIV:\s*(\S+)\s+CLASS:\s*(\S+)\s+FACTOR:\s*(\S+)(?:\s+CATEGORY:\s*(.*))?\s*$/,
	);
	if (!match) return undefined;

	const [, number, rawName, division, , , category] = match;
	const displayName = rawName.trim().replace(/\s+/g, " ");
	const [lastName, ...firstNameParts] = displayName
		.split(",")
		.map((part) => part.trim());

	return {
		internalMemberId: number,
		competitorNumber: number,
		firstName: firstNameParts.join(" ") || undefined,
		lastName: lastName || undefined,
		displayName,
		divisionId: division,
		categoryId: optionalText(category),
		disqualified: false,
	};
}

function parseStageScoreLine(
	line: string,
	internalMemberId: string,
): PractiscoreStageScore | undefined {
	const match = line.match(
		/^\s*Stage\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+\S+)?\s+([\d,.]+)\s*$/i,
	);
	if (!match) return undefined;

	const [
		,
		stageId,
		factor,
		points,
		alpha,
		charlie,
		delta,
		,
		misses,
		noShoot,
		procedurals,
		time,
	] = match;

	return {
		internalStageId: stageId,
		internalMemberId,
		scoreA: parseInteger(alpha),
		scoreC: parseInteger(charlie),
		scoreD: parseInteger(delta),
		misses: parseInteger(misses),
		penalties: parseInteger(noShoot),
		procedurals: parseInteger(procedurals),
		shootTime: parseDecimal(time),
		hitFactor: parseDecimal(factor),
		finalScore: parseInteger(points),
		disqualified: false,
	};
}

function optionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function parseInteger(value: string): number {
	return Number.parseInt(value, 10);
}

function parseDecimal(value: string): number {
	return Number.parseFloat(value.replace(",", "."));
}

function hashText(value: string): string {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index);
		hash |= 0;
	}
	return Math.abs(hash).toString(16).padStart(8, "0");
}
