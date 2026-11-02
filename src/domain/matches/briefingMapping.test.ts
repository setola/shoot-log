import { describe, expect, it } from "vitest";
import { getSavedBriefingMapping, reassignBriefingCandidates } from "./briefingMapping";
import type { MatchStageAsset } from "./stageAssets";

function asset(stage: string, page: number): MatchStageAsset {
	return {
		id: `match:${stage}`, matchEventId: "match", internalStageId: stage,
		sourceFileName: `page-${page}.webp`, sourcePageNumber: page,
		minRounds: 24, maxPoints: 120, mimeType: "image/webp", size: 5,
		content: new Blob(["image"], { type: "image/webp" }),
		createdAt: "2026-01-01", updatedAt: "2026-01-01",
	};
}

describe("reassignBriefingCandidates", () => {
	const stages = [
		{ internalStageId: "1", name: "Stage 1", maxPoints: 120, minRounds: 24 },
		{ internalStageId: "2", name: "Stage 2", maxPoints: 60, minRounds: 12 },
	];

	it("moves stage 2 from page 6 to page 8 after confirming page 6 for stage 1", () => {
		const saved = getSavedBriefingMapping([
			{ ...asset("1", 8), maxPoints: 120, minRounds: 24 },
			{ ...asset("2", 6), maxPoints: 60, minRounds: 12 },
		]);
		expect(reassignBriefingCandidates(stages, saved.candidates,
			{ "1": 6, "2": 6 }, { "1": 6 }, false,
		)).toEqual({ "1": 6, "2": 8 });
	});

	it("replaces an occupied image even with multiple available alternatives", () => {
		const saved = getSavedBriefingMapping([asset("1", 6), asset("2", 8), asset("3", 10)]);
		const result = reassignBriefingCandidates([
			...stages, { internalStageId: "3", name: "Stage 3" },
		], saved.candidates, { "1": 6, "2": 6, "3": 10 }, { "1": 6 }, false);
		expect(result).toEqual({ "1": 6, "2": 8, "3": 10 });
	});

	it("clears occupied selections when no free image remains", () => {
		const saved = getSavedBriefingMapping([asset("1", 6)]);
		expect(reassignBriefingCandidates(stages, saved.candidates,
			{ "1": 6, "2": 6 }, { "1": 6 }, false,
		)).toEqual({ "1": 6 });
	});

	it("keeps PDF metadata matching and never overwrites confirmed stages", () => {
		const saved = getSavedBriefingMapping([
			asset("1", 6), { ...asset("2", 8), maxPoints: 60, minRounds: 12 },
		]);
		expect(reassignBriefingCandidates(stages, saved.candidates,
			{ "1": 6, "2": 6 }, { "1": 6 }, true,
		)).toEqual({ "1": 6, "2": 8 });
	});
});

describe("getSavedBriefingMapping", () => {
	it("reuses imported images and preserves the saved mapping without a PDF", () => {
		const first = asset("1", 8);
		const second = asset("2", 4);
		const result = getSavedBriefingMapping([first, second]);
		expect(result.mapping).toEqual({ "1": 8, "2": 4 });
		expect(result.candidates.map((candidate) => candidate.pageNumber)).toEqual([8, 4]);
		expect(result.candidates[0].imageBlob).toBe(first.content);
		expect(result.candidates[0].sourceFileName).toBe(first.sourceFileName);
	});

	it("offers shared pages once while retaining every stage association", () => {
		const result = getSavedBriefingMapping([asset("1", 8), asset("2", 8)]);
		expect(result.candidates).toHaveLength(1);
		expect(result.mapping).toEqual({ "1": 8, "2": 8 });
	});

	it("starts empty when no images have been imported", () => {
		expect(getSavedBriefingMapping([])).toEqual({ candidates: [], mapping: {} });
	});
});
