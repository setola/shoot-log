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
  registrationReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
