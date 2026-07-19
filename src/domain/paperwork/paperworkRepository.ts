import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import type { PaperworkCredential } from './types';
import { createId } from '../../utils/id';

export type PaperworkCredentialType = PaperworkCredential['type'];

export interface PaperworkFormValues {
  type: PaperworkCredentialType;
  title: string;
  referenceNumber?: string;
  issuingAuthority?: string;
  validFrom?: string;
  validUntil?: string;
  reminderDate?: string;
  notes?: string;
}

export function createEmptyPaperworkForm(): PaperworkFormValues {
  return {
    type: 'license',
    title: '',
    referenceNumber: '',
    issuingAuthority: '',
    validFrom: '',
    validUntil: '',
    reminderDate: '',
    notes: ''
  };
}

export function paperworkToFormValues(record: PaperworkCredential): PaperworkFormValues {
  return {
    type: record.type,
    title: record.title,
    referenceNumber: record.referenceNumber ?? '',
    issuingAuthority: record.issuingAuthority ?? '',
    validFrom: record.validFrom ?? '',
    validUntil: record.validUntil ?? '',
    reminderDate: record.reminderDate ?? '',
    notes: record.notes ?? ''
  };
}

export async function createPaperworkCredential(values: PaperworkFormValues): Promise<string> {
  const now = nowIso();
  const record: PaperworkCredential = {
    id: createId(),
    ...normalizePaperworkValues(values),
    createdAt: now,
    updatedAt: now
  };

  await db.paperworkCredentials.add(record);
  return record.id;
}

export async function updatePaperworkCredential(id: string, values: PaperworkFormValues): Promise<void> {
  await db.paperworkCredentials.update(id, {
    ...normalizePaperworkValues(values),
    updatedAt: nowIso()
  });
}

export async function deletePaperworkCredential(id: string): Promise<void> {
  await db.transaction('rw', [db.paperworkCredentials, db.paperworkAttachments], async () => {
    await db.paperworkCredentials.delete(id);
    await db.paperworkAttachments.where('credentialId').equals(id).delete();
  });
}

export async function addPaperworkAttachment(credentialId: string, file: File): Promise<string> {
  const now = nowIso();
  const id = createId();

  await db.paperworkAttachments.add({
    id,
    credentialId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    content: file,
    createdAt: now,
    updatedAt: now
  });

  const credential = await db.paperworkCredentials.get(credentialId);
  const attachmentIds = Array.from(new Set([...(credential?.attachmentIds ?? []), id]));
  await db.paperworkCredentials.update(credentialId, { attachmentIds, updatedAt: nowIso() });

  return id;
}

export async function deletePaperworkAttachment(credentialId: string, attachmentId: string): Promise<void> {
  await db.transaction('rw', [db.paperworkCredentials, db.paperworkAttachments], async () => {
    await db.paperworkAttachments.delete(attachmentId);
    const credential = await db.paperworkCredentials.get(credentialId);
    await db.paperworkCredentials.update(credentialId, {
      attachmentIds: (credential?.attachmentIds ?? []).filter((id) => id !== attachmentId),
      updatedAt: nowIso()
    });
  });
}

function normalizePaperworkValues(values: PaperworkFormValues): Omit<PaperworkCredential, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: values.type,
    title: values.title.trim(),
    referenceNumber: optionalText(values.referenceNumber),
    issuingAuthority: optionalText(values.issuingAuthority),
    validFrom: optionalText(values.validFrom),
    validUntil: optionalText(values.validUntil),
    reminderDate: optionalText(values.reminderDate),
    notes: optionalText(values.notes),
    attachmentIds: []
  };
}

function optionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
