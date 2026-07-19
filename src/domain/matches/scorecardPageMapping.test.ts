import { describe, expect, it } from "vitest";
import {
	createFallbackStagePageMapping,
	getEffectiveStagePageMapping,
	repairScorecardPageUrl,
	resolveCatalogPageUrl,
} from "./scorecardPageMapping";
import type {
	MatchScorecard,
	MatchScorecardPage,
	MatchScorecardStage,
} from "./scorecardTypes";

const stages: MatchScorecardStage[] = Array.from({ length: 3 }, (_, index) => ({
	stageId: String(index + 1),
	name: `Stage ${index + 1}`,
	charlie: 0,
	delta: 0,
	miss: 0,
	noShoot: 0,
	procedures: 0,
}));

const pages: MatchScorecardPage[] = [1, 2, 3, 4, 5].map((pageNumber) => ({
	pageNumber,
	url: `./assets/pages/page-${String(pageNumber).padStart(2, "0")}.webp`,
}));

function createScorecard(overrides: Partial<MatchScorecard>): MatchScorecard {
	return {
		id: "scorecard-1",
		mare2MatchId: "1674",
		matchName: "NATIONAL SHOTGUN BENELLI 2026",
		powerFactor: "minor",
		matchUrl:
			"https://shooting-logbook-mare2-data.pages.dev/matches/1674/match.json",
		snapshotUrl:
			"https://shooting-logbook-mare2-data.pages.dev/matches/1674/snapshot.json",
		stages,
		createdAt: "2026-07-18T00:00:00.000Z",
		updatedAt: "2026-07-18T00:00:00.000Z",
		...overrides,
	};
}

describe("scorecard page mapping", () => {
	it("maps the last N public pages to stages when no explicit override exists", () => {
		expect(createFallbackStagePageMapping(stages, pages)).toEqual({
			"1": 3,
			"2": 4,
			"3": 5,
		});
	});

	it("prefers an explicit stage page mapping over the fallback", () => {
		const scorecard = createScorecard({
			publicPages: pages,
			stagePageMapping: { "1": 11, "2": 12, "3": 13 },
		});

		expect(getEffectiveStagePageMapping(scorecard)).toEqual({
			"1": 11,
			"2": 12,
			"3": 13,
		});
	});

	it("resolves catalog page urls relative to the match file, not the manifest", () => {
		expect(
			resolveCatalogPageUrl(
				"./assets/pages/page-06.webp",
				"https://shooting-logbook-mare2-data.pages.dev/matches/1674/match.json",
			),
		).toBe(
			"https://shooting-logbook-mare2-data.pages.dev/matches/1674/assets/pages/page-06.webp",
		);
	});

	it("repairs scorecards created with page urls resolved from the manifest root", () => {
		const scorecard = createScorecard({});

		expect(
			repairScorecardPageUrl(
				"https://shooting-logbook-mare2-data.pages.dev/assets/pages/page-06.webp",
				scorecard,
			),
		).toBe(
			"https://shooting-logbook-mare2-data.pages.dev/matches/1674/assets/pages/page-06.webp",
		);
	});
});
