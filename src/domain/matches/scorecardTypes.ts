export type ScorecardPowerFactor = "minor" | "major";

export interface MatchScorecardPage {
	pageNumber: number;
	url: string;
	mimeType?: string;
}

export interface MatchScorecardStage {
	stageId: string;
	name: string;
	minRounds?: number;
	maxPoints?: number;
	timeSeconds?: number;
	charlie: number;
	delta: number;
	miss: number;
	noShoot: number;
	procedures: number;
	notes?: string;
}

export interface MatchScorecard {
	id: string;
	mare2MatchId: string;
	matchName: string;
	dateFrom?: string;
	dateTo?: string;
	location?: string;
	powerFactor: ScorecardPowerFactor;
	matchUrl: string;
	snapshotUrl: string;
	publicPages?: MatchScorecardPage[];
	stagePageMapping?: Record<string, number>;
	stages: MatchScorecardStage[];
	createdAt: string;
	updatedAt: string;
}
