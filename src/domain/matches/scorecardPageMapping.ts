import type {
	MatchScorecard,
	MatchScorecardPage,
	MatchScorecardStage,
} from "./scorecardTypes";

export function createFallbackStagePageMapping(
	stages: MatchScorecardStage[],
	pages: MatchScorecardPage[] | undefined,
): Record<string, number> | undefined {
	if (!pages?.length || stages.length === 0) return undefined;
	const mappedPages = pages.slice(-stages.length);
	if (mappedPages.length !== stages.length) return undefined;
	return Object.fromEntries(
		stages.map((stage, index) => [
			stage.stageId,
			mappedPages[index].pageNumber,
		]),
	);
}

export function getEffectiveStagePageMapping(
	scorecard: Pick<
		MatchScorecard,
		"stages" | "publicPages" | "stagePageMapping"
	>,
): Record<string, number> | undefined {
	if (
		scorecard.stagePageMapping &&
		Object.keys(scorecard.stagePageMapping).length > 0
	) {
		return scorecard.stagePageMapping;
	}
	return createFallbackStagePageMapping(
		scorecard.stages,
		scorecard.publicPages,
	);
}

export function resolveCatalogPageUrl(
	pageUrl: string,
	matchUrl: string,
): string {
	try {
		return new URL(pageUrl, matchUrl).toString();
	} catch {
		return pageUrl;
	}
}

export function repairScorecardPageUrl(
	url: string,
	scorecard: Pick<MatchScorecard, "matchUrl">,
): string {
	try {
		const matchUrl = new URL(scorecard.matchUrl);
		const pageUrl = new URL(url, matchUrl);
		if (pageUrl.origin !== matchUrl.origin) return pageUrl.toString();
		if (!pageUrl.pathname.startsWith("/assets/pages/"))
			return pageUrl.toString();
		const matchDirectory = matchUrl.pathname.replace(/\/[^/]*$/, "");
		pageUrl.pathname = `${matchDirectory}${pageUrl.pathname}`;
		return pageUrl.toString();
	} catch {
		return url;
	}
}
