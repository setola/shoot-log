import type { Mare2BriefingStageCandidate } from "./mare2BriefingParser";
import type { MatchStageAsset } from "./stageAssets";
import type { PractiscoreStage } from "./practiscoreTypes";

export function reassignBriefingCandidates(
	stages: PractiscoreStage[],
	candidates: Mare2BriefingStageCandidate[],
	currentMapping: Record<string, number>,
	confirmedPages: Record<string, number>,
	usePdfMetadata: boolean,
): Record<string, number> {
	const nextMapping = { ...currentMapping, ...confirmedPages };
	const usedPages = new Set(Object.values(confirmedPages));
	for (const stage of stages) {
		if (confirmedPages[stage.internalStageId] !== undefined) continue;
		const available = candidates.filter((candidate) => !usedPages.has(candidate.pageNumber));
		const byPoints = available.filter((candidate) => candidate.maxPoints === stage.maxPoints);
		const byRounds = byPoints.filter((candidate) => candidate.minRounds === stage.minRounds);
		const remaining = usePdfMetadata ? (byRounds.length ? byRounds : byPoints) : available;
		const currentPage = currentMapping[stage.internalStageId];
		const candidate = remaining.find((item) => item.pageNumber === currentPage) ?? remaining[0];
		if (candidate) {
			nextMapping[stage.internalStageId] = candidate.pageNumber;
			usedPages.add(candidate.pageNumber);
		} else {
			delete nextMapping[stage.internalStageId];
		}
	}
	return nextMapping;
}

export interface BriefingCandidate extends Mare2BriefingStageCandidate {
	sourceFileName?: string;
}

export function getSavedBriefingMapping(assets: MatchStageAsset[]) {
	const candidates = new Map<number, BriefingCandidate>();
	const mapping: Record<string, number> = {};
	for (const asset of assets) {
		mapping[asset.internalStageId] = asset.sourcePageNumber;
		if (candidates.has(asset.sourcePageNumber)) continue;
		candidates.set(asset.sourcePageNumber, {
			stageNumber: candidates.size + 1,
			pageNumber: asset.sourcePageNumber,
			courseType: asset.courseType,
			minRounds: asset.minRounds,
			maxPoints: asset.maxPoints,
			imageBlob: asset.content,
			sourceFileName: asset.sourceFileName,
		});
	}
	return { candidates: [...candidates.values()], mapping };
}
