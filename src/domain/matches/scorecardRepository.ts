import { db } from "../../db/schema";
import { createId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type { PractiscoreMatchSnapshot } from "./practiscoreTypes";
import type {
	MatchScorecard,
	MatchScorecardPage,
	MatchScorecardStage,
	ScorecardPowerFactor,
} from "./scorecardTypes";

export interface ScorecardSourceMatch {
	mare2MatchId: string;
	name: string;
	dateFrom?: string;
	dateTo?: string;
	location?: string;
	matchUrl: string;
	snapshotUrl: string;
	publicPages?: MatchScorecardPage[];
	stagePageMapping?: Record<string, number>;
}

export async function createScorecardFromMare2Catalog(
	match: ScorecardSourceMatch,
	snapshot: PractiscoreMatchSnapshot,
): Promise<string> {
	const now = nowIso();
	const id = createId();
	const stages: MatchScorecardStage[] = snapshot.stages.map((stage) => ({
		stageId: stage.internalStageId,
		name: stage.name,
		minRounds: stage.minRounds,
		maxPoints: stage.maxPoints,
		charlie: 0,
		delta: 0,
		miss: 0,
		noShoot: 0,
		procedures: 0,
	}));
	const scorecard: MatchScorecard = {
		id,
		mare2MatchId: match.mare2MatchId,
		matchName: match.name,
		dateFrom: match.dateFrom,
		dateTo: match.dateTo,
		location: match.location,
		powerFactor: "minor",
		matchUrl: match.matchUrl,
		snapshotUrl: match.snapshotUrl,
		publicPages: match.publicPages,
		stagePageMapping: match.stagePageMapping,
		stages,
		createdAt: now,
		updatedAt: now,
	};
	await db.matchScorecards.add(scorecard);
	return id;
}

export async function updateScorecardPowerFactor(
	id: string,
	powerFactor: ScorecardPowerFactor,
): Promise<void> {
	await db.matchScorecards.update(id, { powerFactor, updatedAt: nowIso() });
}

export async function updateScorecardStage(
	scorecard: MatchScorecard,
	stageId: string,
	updates: Partial<MatchScorecardStage>,
): Promise<void> {
	const stages = scorecard.stages.map((stage) =>
		stage.stageId === stageId ? { ...stage, ...updates } : stage,
	);
	await db.matchScorecards.update(scorecard.id, {
		stages,
		updatedAt: nowIso(),
	});
}

export async function updateScorecardStagePageMapping(
	id: string,
	stagePageMapping: Record<string, number>,
): Promise<void> {
	await db.matchScorecards.update(id, {
		stagePageMapping,
		updatedAt: nowIso(),
	});
}

export async function deleteScorecard(id: string): Promise<void> {
	await db.matchScorecards.delete(id);
}

export function calculateScorecardStage(
	stage: MatchScorecardStage,
	powerFactor: ScorecardPowerFactor,
) {
	const requiredHits = Math.max(
		0,
		stage.maxPoints ? Math.round(stage.maxPoints / 5) : (stage.minRounds ?? 0),
	);
	const alpha = Math.max(
		0,
		requiredHits - stage.charlie - stage.delta - stage.miss,
	);
	const charlieValue = powerFactor === "major" ? 4 : 3;
	const deltaValue = powerFactor === "major" ? 2 : 1;
	const points =
		alpha * 5 +
		stage.charlie * charlieValue +
		stage.delta * deltaValue -
		stage.miss * 10 -
		stage.noShoot * 10 -
		stage.procedures * 10;
	const hitFactor =
		stage.timeSeconds && stage.timeSeconds > 0
			? points / stage.timeSeconds
			: undefined;
	return { requiredHits, alpha, points, hitFactor };
}
