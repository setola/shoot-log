export interface MatchEvent {
  id: string;
  name: string;
  date: string;
  clubOrRange?: string;
  discipline?: string;
  divisionOrCategory?: string;
  firearmId?: string;
  roundsFired: number;
  score?: string;
  placement?: string;
  practiscoreMatchId?: string;
  practiscoreInternalMatchId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
