import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import type { AppSettings } from './types';

export const DEFAULT_SETTINGS_ID = 'default';

export async function updateOwnerPractiscoreIdentifiers(identifiers: string[]): Promise<void> {
  const now = nowIso();
  const existing = await db.appSettings.get(DEFAULT_SETTINGS_ID);
  const record: AppSettings = {
    id: DEFAULT_SETTINGS_ID,
    ownerPractiscoreIdentifiers: normalizeIdentifiers(identifiers),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  await db.appSettings.put(record);
}

export function normalizeIdentifiers(identifiers: string[]): string[] {
  return [...new Set(identifiers.map((identifier) => identifier.trim()).filter(Boolean))];
}
