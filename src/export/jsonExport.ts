import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION, type BackupEnvelope } from '../sync/backupFormat';

export function createBackupEnvelope<TPayload>(payload: TPayload, deviceName?: string): BackupEnvelope<TPayload> {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    deviceName,
    payload
  };
}
