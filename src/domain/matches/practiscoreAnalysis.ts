import type { PractiscoreCompetitor, PractiscoreImportRecord, PractiscoreStageScore } from './practiscoreTypes';

export type HitSliceKey = 'alpha' | 'charlie' | 'delta' | 'miss' | 'noShoot';

export type HitSlice = {
  key: HitSliceKey;
  value: number;
  color: string;
};

export type StagePlacementPoint = {
  stageId: string;
  stageName: string;
  placement: number;
};

export type StageCompetitorDetail = {
  stageId: string;
  stageName: string;
  minRounds?: number;
  maxPoints?: number;
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  noShoot: number;
  procedurals: number;
  time?: number;
  hitFactor?: number;
};

export function calculateHitBreakdown(record: PractiscoreImportRecord | undefined, competitor: PractiscoreCompetitor | undefined): { total: number; slices: HitSlice[] } {
  const totals: Record<HitSliceKey, number> = { alpha: 0, charlie: 0, delta: 0, miss: 0, noShoot: 0 };

  if (record && competitor) {
    for (const score of record.snapshot.scores.filter((stageScore) => stageScore.internalMemberId === competitor.internalMemberId && !isRemovedScore(stageScore))) {
      totals.alpha += score.scoreA ?? 0;
      totals.charlie += score.scoreC ?? 0;
      totals.delta += score.scoreD ?? 0;
      totals.miss += score.misses ?? 0;
      totals.noShoot += score.penalties ?? 0;
    }
  }

  const allSlices: HitSlice[] = [
    { key: 'alpha', value: totals.alpha, color: '#16a34a' },
    { key: 'charlie', value: totals.charlie, color: '#2563eb' },
    { key: 'delta', value: totals.delta, color: '#f59e0b' },
    { key: 'miss', value: totals.miss, color: '#dc2626' },
    { key: 'noShoot', value: totals.noShoot, color: '#7c3aed' }
  ];
  const slices = allSlices.filter((slice) => slice.value > 0);

  return { total: slices.reduce((total, slice) => total + slice.value, 0), slices };
}

export function calculateStageDetails(record: PractiscoreImportRecord | undefined, competitor: PractiscoreCompetitor | undefined): StageCompetitorDetail[] {
  if (!record || !competitor) return [];

  return record.snapshot.stages.flatMap((stage) => {
    const score = record.snapshot.scores.find((stageScore) => stageScore.internalStageId === stage.internalStageId && stageScore.internalMemberId === competitor.internalMemberId && !isRemovedScore(stageScore));
    if (!score) return [];

    return [{
      stageId: stage.internalStageId,
      stageName: stage.name,
      minRounds: stage.minRounds,
      maxPoints: stage.maxPoints,
      alpha: score.scoreA ?? 0,
      charlie: score.scoreC ?? 0,
      delta: score.scoreD ?? 0,
      miss: score.misses ?? 0,
      noShoot: score.penalties ?? 0,
      procedurals: score.procedurals ?? 0,
      time: score.shootTime,
      hitFactor: score.hitFactor
    }];
  });
}

export function calculateStagePlacementTrend(record: PractiscoreImportRecord | undefined, competitor: PractiscoreCompetitor | undefined): StagePlacementPoint[] {
  if (!record || !competitor) return [];

  const competitorDivisionId = competitor.divisionId;
  const memberIdsInDivision = new Set(
    record.snapshot.competitors
      .filter((candidate) => !candidate.disqualified && (!competitorDivisionId || candidate.divisionId === competitorDivisionId))
      .map((candidate) => candidate.internalMemberId)
  );

  return record.snapshot.stages.flatMap((stage) => {
    const stageScores = record.snapshot.scores
      .filter((score) => score.internalStageId === stage.internalStageId && memberIdsInDivision.has(score.internalMemberId) && !score.disqualified && !isRemovedScore(score))
      .sort((a, b) => (b.hitFactor ?? 0) - (a.hitFactor ?? 0));
    const placement = stageScores.findIndex((score) => score.internalMemberId === competitor.internalMemberId) + 1;

    return placement > 0 ? [{ stageId: stage.internalStageId, stageName: stage.name, placement }] : [];
  });
}

function isRemovedScore(score: PractiscoreStageScore): boolean {
  return score.removed === true || score.noVerify === true || (score.shootTime ?? 0) === 0
    && (score.hitFactor ?? 0) === 0
    && (score.finalScore ?? 0) === 0
    && (score.scoreA ?? 0) === 0
    && (score.scoreC ?? 0) === 0
    && (score.scoreD ?? 0) === 0
    && (score.misses ?? 0) === 0
    && (score.penalties ?? 0) === 0
    && (score.procedurals ?? 0) === 0;
}
