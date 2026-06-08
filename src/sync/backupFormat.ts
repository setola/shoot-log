export const BACKUP_FORMAT = 'shooting-logbook-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupEnvelope<TPayload = unknown> {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  deviceName?: string;
  payload: TPayload;
}
