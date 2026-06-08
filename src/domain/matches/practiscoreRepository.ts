import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import type { MatchEvent } from './types';
import type { PractiscoreImportRecord, PractiscoreMatchSnapshot } from './practiscoreTypes';

export async function importPractiscoreSnapshot(snapshot: PractiscoreMatchSnapshot, existingMatchEventId?: string): Promise<string> {
  const now = nowIso();
  const matchEventId = existingMatchEventId ?? crypto.randomUUID();
  const matchEvent = createMatchEventFromSnapshot(snapshot, matchEventId, now);
  const importRecord: PractiscoreImportRecord = {
    id: matchEventId,
    matchEventId,
    practiscoreMatchId: snapshot.practiscoreMatchId,
    sourceFileName: snapshot.sourceFileName,
    importedAt: snapshot.importedAt,
    createdAt: now,
    updatedAt: now,
    snapshot
  };

  await db.transaction('rw', [db.matchEvents, db.practiscoreMatchImports], async () => {
    await db.matchEvents.put(matchEvent);
    await db.practiscoreMatchImports.where('matchEventId').equals(matchEventId).delete();
    await db.practiscoreMatchImports.put(importRecord);
  });

  return matchEventId;
}

export async function deletePractiscoreImportForMatch(matchEventId: string): Promise<void> {
  await db.practiscoreMatchImports.where('matchEventId').equals(matchEventId).delete();
}

function createMatchEventFromSnapshot(snapshot: PractiscoreMatchSnapshot, id: string, now: string): MatchEvent {
  const roundsFired = snapshot.stages.reduce((total, stage) => total + (stage.minRounds ?? 0), 0);

  return {
    id,
    name: snapshot.match.name || `PractiScore ${snapshot.practiscoreMatchId}`,
    date: snapshot.match.date || new Date().toISOString().slice(0, 10),
    discipline: 'PractiScore',
    roundsFired,
    registrationReference: snapshot.practiscoreMatchId,
    practiscoreMatchId: snapshot.practiscoreMatchId,
    practiscoreInternalMatchId: snapshot.match.internalMatchId,
    notes: `Imported from PractiScore ${snapshot.sourceFileName}`,
    createdAt: now,
    updatedAt: now
  };
}
