import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import type { MatchEvent } from './types';
import { createId } from '../../utils/id';

export type MatchFormValues = Omit<MatchEvent, 'id' | 'createdAt' | 'updatedAt' | 'roundsFired'> & { roundsFired: string };

export function createEmptyMatchForm(): MatchFormValues {
  return { name: '', date: new Date().toISOString().slice(0, 10), clubOrRange: '', discipline: '', divisionOrCategory: '', firearmId: '', roundsFired: '0', score: '', placement: '', notes: '' };
}

export function matchToFormValues(match: MatchEvent): MatchFormValues {
  return { ...match, roundsFired: String(match.roundsFired) };
}

export async function createMatchEvent(values: MatchFormValues): Promise<string> {
  const now = nowIso();
  const record: MatchEvent = { id: createId(), ...normalize(values), createdAt: now, updatedAt: now };
  await db.matchEvents.add(record);
  return record.id;
}

export async function updateMatchEvent(id: string, values: MatchFormValues): Promise<void> {
  await db.matchEvents.update(id, { ...normalize(values), updatedAt: nowIso() });
}

export async function deleteMatchEvent(id: string): Promise<void> {
  await db.transaction('rw', [db.matchEvents, db.practiscoreMatchImports], async () => {
    await db.matchEvents.delete(id);
    await db.practiscoreMatchImports.where('matchEventId').equals(id).delete();
  });
}

function normalize(values: MatchFormValues): Omit<MatchEvent, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: values.name.trim(),
    date: values.date,
    clubOrRange: optional(values.clubOrRange),
    discipline: optional(values.discipline),
    divisionOrCategory: optional(values.divisionOrCategory),
    firearmId: optional(values.firearmId),
    roundsFired: Number(values.roundsFired) || 0,
    score: optional(values.score),
    placement: optional(values.placement),
    notes: optional(values.notes)
  };
}

function optional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
