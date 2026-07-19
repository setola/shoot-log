import type { Firearm, FirearmType } from './types';
import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import { createId } from '../../utils/id';

export interface FirearmFormValues {
  nickname: string;
  manufacturer?: string;
  model?: string;
  type: FirearmType;
  caliber?: string;
  serialNumber?: string;
  acquisitionDate?: string;
  acquisitionReference?: string;
  initialRoundCount: number;
  archived: boolean;
  notes?: string;
}

export function createEmptyFirearmForm(): FirearmFormValues {
  return {
    nickname: '',
    manufacturer: '',
    model: '',
    type: 'pistol',
    caliber: '',
    serialNumber: '',
    acquisitionDate: '',
    acquisitionReference: '',
    initialRoundCount: 0,
    archived: false,
    notes: ''
  };
}

export function firearmToFormValues(firearm: Firearm): FirearmFormValues {
  return {
    nickname: firearm.nickname,
    manufacturer: firearm.manufacturer ?? '',
    model: firearm.model ?? '',
    type: firearm.type,
    caliber: firearm.caliber ?? '',
    serialNumber: firearm.serialNumber ?? '',
    acquisitionDate: firearm.acquisitionDate ?? '',
    acquisitionReference: firearm.acquisitionReference ?? '',
    initialRoundCount: firearm.initialRoundCount,
    archived: firearm.archived,
    notes: firearm.notes ?? ''
  };
}

export async function createFirearm(values: FirearmFormValues): Promise<string> {
  const now = nowIso();
  const firearm: Firearm = {
    id: createId(),
    ...normalizeFirearmValues(values),
    createdAt: now,
    updatedAt: now
  };

  await db.firearms.add(firearm);
  return firearm.id;
}

export async function updateFirearm(id: string, values: FirearmFormValues): Promise<void> {
  await db.firearms.update(id, {
    ...normalizeFirearmValues(values),
    updatedAt: nowIso()
  });
}

export async function deleteFirearm(id: string): Promise<void> {
  await db.firearms.delete(id);
}

function normalizeFirearmValues(values: FirearmFormValues): Omit<Firearm, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    nickname: values.nickname.trim(),
    manufacturer: optionalText(values.manufacturer),
    model: optionalText(values.model),
    type: values.type,
    caliber: optionalText(values.caliber),
    serialNumber: optionalText(values.serialNumber),
    acquisitionDate: optionalText(values.acquisitionDate),
    acquisitionReference: optionalText(values.acquisitionReference),
    initialRoundCount: Number.isFinite(values.initialRoundCount) ? Math.max(0, values.initialRoundCount) : 0,
    archived: values.archived,
    notes: optionalText(values.notes)
  };
}

function optionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
