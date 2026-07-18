import { db } from "../../db/schema";
import { nowIso } from "../../utils/time";

export interface MatchAnalysisSelection {
	matchEventId: string;
	competitorQueries: string[];
	initializedFromRegularCompetitors: boolean;
	createdAt: string;
	updatedAt: string;
}

export async function saveMatchAnalysisSelection(
	matchEventId: string,
	competitorQueries: string[],
	initializedFromRegularCompetitors: boolean,
): Promise<void> {
	const now = nowIso();
	const existing = await db.matchAnalysisSelections.get(matchEventId);
	await db.matchAnalysisSelections.put({
		matchEventId,
		competitorQueries: [
			...new Set(
				competitorQueries.map((query) => query.trim()).filter(Boolean),
			),
		],
		initializedFromRegularCompetitors,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	});
}
