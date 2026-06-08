import Dexie, { type Table } from 'dexie';
import type { Firearm } from '../domain/firearms/types';
import type { TrainingSession } from '../domain/training/types';
import type { MatchEvent } from '../domain/matches/types';
import type { PractiscoreImportRecord } from '../domain/matches/practiscoreTypes';
import type { AmmunitionBatch, AmmoTransaction } from '../domain/ammunition/types';
import type { MaintenanceEvent } from '../domain/maintenance/types';
import type { PaperworkAttachment } from '../domain/paperwork/attachmentTypes';
import type { PaperworkCredential } from '../domain/paperwork/types';
import type { AppSettings } from '../domain/settings/types';

export class LogbookDatabase extends Dexie {
  firearms!: Table<Firearm, string>;
  trainingSessions!: Table<TrainingSession, string>;
  matchEvents!: Table<MatchEvent, string>;
  practiscoreMatchImports!: Table<PractiscoreImportRecord, string>;
  ammunitionBatches!: Table<AmmunitionBatch, string>;
  ammoTransactions!: Table<AmmoTransaction, string>;
  maintenanceEvents!: Table<MaintenanceEvent, string>;
  paperworkCredentials!: Table<PaperworkCredential, string>;
  paperworkAttachments!: Table<PaperworkAttachment, string>;
  appSettings!: Table<AppSettings, string>;

  constructor() {
    super('shooting-logbook');

    this.version(1).stores({
      firearms: 'id, nickname, caliber, archived, updatedAt',
      trainingSessions: 'id, date, firearmId, discipline, updatedAt',
      matchEvents: 'id, date, firearmId, discipline, updatedAt',
      ammunitionBatches: 'id, caliber, updatedAt',
      ammoTransactions: 'id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt',
      maintenanceEvents: 'id, firearmId, date, type, updatedAt',
      paperworkCredentials: 'id, type, validUntil, reminderDate, updatedAt'
    });

    this.version(2).stores({
      firearms: 'id, nickname, caliber, archived, updatedAt',
      trainingSessions: 'id, date, firearmId, discipline, updatedAt',
      matchEvents: 'id, date, firearmId, discipline, updatedAt',
      ammunitionBatches: 'id, caliber, updatedAt',
      ammoTransactions: 'id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt',
      maintenanceEvents: 'id, firearmId, date, type, updatedAt',
      paperworkCredentials: 'id, title, type, validUntil, reminderDate, updatedAt'
    });

    this.version(3).stores({
      firearms: 'id, nickname, caliber, archived, updatedAt',
      trainingSessions: 'id, date, firearmId, discipline, updatedAt',
      matchEvents: 'id, date, firearmId, discipline, updatedAt',
      ammunitionBatches: 'id, caliber, updatedAt',
      ammoTransactions: 'id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt',
      maintenanceEvents: 'id, firearmId, date, type, updatedAt',
      paperworkCredentials: 'id, title, type, validUntil, reminderDate, updatedAt',
      paperworkAttachments: 'id, credentialId, fileName, mimeType, updatedAt'
    });

    this.version(4).stores({
      firearms: 'id, nickname, caliber, archived, updatedAt',
      trainingSessions: 'id, date, firearmId, discipline, updatedAt',
      matchEvents: 'id, date, firearmId, discipline, updatedAt',
      practiscoreMatchImports: 'id, matchEventId, practiscoreMatchId, importedAt, updatedAt',
      ammunitionBatches: 'id, caliber, updatedAt',
      ammoTransactions: 'id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt',
      maintenanceEvents: 'id, firearmId, date, type, updatedAt',
      paperworkCredentials: 'id, title, type, validUntil, reminderDate, updatedAt',
      paperworkAttachments: 'id, credentialId, fileName, mimeType, updatedAt'
    });

    this.version(5).stores({
      firearms: 'id, nickname, caliber, archived, updatedAt',
      trainingSessions: 'id, date, firearmId, discipline, updatedAt',
      matchEvents: 'id, date, firearmId, discipline, updatedAt',
      practiscoreMatchImports: 'id, matchEventId, practiscoreMatchId, importedAt, updatedAt',
      ammunitionBatches: 'id, caliber, updatedAt',
      ammoTransactions: 'id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt',
      maintenanceEvents: 'id, firearmId, date, type, updatedAt',
      paperworkCredentials: 'id, title, type, validUntil, reminderDate, updatedAt',
      paperworkAttachments: 'id, credentialId, fileName, mimeType, updatedAt',
      appSettings: 'id, updatedAt'
    });
  }
}

export const db = new LogbookDatabase();
