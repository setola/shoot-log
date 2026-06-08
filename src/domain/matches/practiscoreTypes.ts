export interface PractiscoreImportRecord {
  id: string;
  matchEventId: string;
  practiscoreMatchId: string;
  sourceFileName: string;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
  snapshot: PractiscoreMatchSnapshot;
}

export interface PractiscoreMatchSnapshot {
  practiscoreMatchId: string;
  importedAt: string;
  sourceFileName: string;
  match: PractiscoreMatchInfo;
  stages: PractiscoreStage[];
  competitors: PractiscoreCompetitor[];
  scores: PractiscoreStageScore[];
  rawXml: Record<string, string>;
}

export interface PractiscoreMatchInfo {
  internalMatchId: string;
  name: string;
  date: string;
  level?: string;
  countryId?: string;
  firearmId?: string;
  squadCount?: number;
}

export interface PractiscoreStage {
  internalStageId: string;
  name: string;
  minRounds?: number;
  maxPoints?: number;
  courseId?: string;
}

export interface PractiscoreCompetitor {
  internalMemberId: string;
  competitorNumber?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  alias?: string;
  divisionId?: string;
  categoryId?: string;
  squadId?: string;
  disqualified: boolean;
}

export interface PractiscoreStageScore {
  internalStageId: string;
  internalMemberId: string;
  scoreA?: number;
  scoreB?: number;
  scoreC?: number;
  scoreD?: number;
  misses?: number;
  penalties?: number;
  procedurals?: number;
  shootTime?: number;
  hitFactor?: number;
  finalScore?: number;
  disqualified: boolean;
  removed?: boolean;
  noVerify?: boolean;
}
