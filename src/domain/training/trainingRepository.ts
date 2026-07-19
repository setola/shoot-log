import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import type { TrainingSession } from './types';
import { createId } from '../../utils/id';

export type TrainingFormValues = Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt' | 'roundsFired' | 'drills'> & {
  roundsFired: string;
  drillsText?: string;
};

export function createEmptyTrainingForm(): TrainingFormValues {
  return { date: new Date().toISOString().slice(0, 10), location: '', discipline: '', firearmId: '', ammunitionId: '', ammoDescription: '', roundsFired: '0', drillsText: '', distance: '', score: '', notes: '' };
}

export function trainingToFormValues(session: TrainingSession): TrainingFormValues {
  return { ...session, roundsFired: String(session.roundsFired), drillsText: session.drills?.join('\n') ?? '' };
}

export async function createTrainingSession(values: TrainingFormValues): Promise<string> {
  const now = nowIso();
  const record: TrainingSession = { id: createId(), ...normalize(values), createdAt: now, updatedAt: now };
  await db.trainingSessions.add(record);
  return record.id;
}

export async function updateTrainingSession(id: string, values: TrainingFormValues): Promise<void> {
  await db.trainingSessions.update(id, { ...normalize(values), updatedAt: nowIso() });
}

export async function deleteTrainingSession(id: string): Promise<void> {
  await db.trainingSessions.delete(id);
}

function normalize(values: TrainingFormValues): Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    date: values.date,
    location: optional(values.location),
    discipline: optional(values.discipline),
    firearmId: optional(values.firearmId),
    ammunitionId: optional(values.ammunitionId),
    ammoDescription: optional(values.ammoDescription),
    roundsFired: Number(values.roundsFired) || 0,
    drills: values.drillsText?.split('\n').map((item) => item.trim()).filter(Boolean),
    distance: optional(values.distance),
    score: optional(values.score),
    notes: optional(values.notes)
  };
}

function optional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
