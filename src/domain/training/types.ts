export interface TrainingSession {
  id: string;
  date: string;
  location?: string;
  discipline?: string;
  firearmId?: string;
  ammunitionId?: string;
  ammoDescription?: string;
  roundsFired: number;
  drills?: string[];
  distance?: string;
  score?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
