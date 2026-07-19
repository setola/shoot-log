import Dexie, { type Table } from "dexie";
import type { Firearm } from "../domain/firearms/types";
import type { TrainingSession } from "../domain/training/types";
import type { MatchEvent } from "../domain/matches/types";
import type { MatchStageAsset } from "../domain/matches/stageAssets";
import type { PractiscoreImportRecord } from "../domain/matches/practiscoreTypes";
import type {
	AmmunitionBatch,
	AmmoTransaction,
	ChronographSession,
	ReloadingBrass,
	ReloadingBullet,
	ReloadingPowder,
	ReloadingPrimer,
	ReloadingRecipe,
} from "../domain/ammunition/types";
import type { MaintenanceEvent } from "../domain/maintenance/types";
import type { PaperworkAttachment } from "../domain/paperwork/attachmentTypes";
import type { PaperworkCredential } from "../domain/paperwork/types";
import type { AppSettings } from "../domain/settings/types";
import type { RegularCompetitor } from "../domain/settings/regularCompetitors";
import type { MatchAnalysisSelection } from "../domain/matches/analysisSelection";
import type { MatchScorecard } from "../domain/matches/scorecardTypes";

export class LogbookDatabase extends Dexie {
	firearms!: Table<Firearm, string>;
	trainingSessions!: Table<TrainingSession, string>;
	matchEvents!: Table<MatchEvent, string>;
	practiscoreMatchImports!: Table<PractiscoreImportRecord, string>;
	matchStageAssets!: Table<MatchStageAsset, string>;
	ammunitionBatches!: Table<AmmunitionBatch, string>;
	ammoTransactions!: Table<AmmoTransaction, string>;
	reloadingBullets!: Table<ReloadingBullet, string>;
	reloadingPowders!: Table<ReloadingPowder, string>;
	reloadingPrimers!: Table<ReloadingPrimer, string>;
	reloadingBrass!: Table<ReloadingBrass, string>;
	reloadingRecipes!: Table<ReloadingRecipe, string>;
	chronographSessions!: Table<ChronographSession, string>;
	maintenanceEvents!: Table<MaintenanceEvent, string>;
	paperworkCredentials!: Table<PaperworkCredential, string>;
	paperworkAttachments!: Table<PaperworkAttachment, string>;
	appSettings!: Table<AppSettings, string>;
	regularCompetitors!: Table<RegularCompetitor, string>;
	matchAnalysisSelections!: Table<MatchAnalysisSelection, string>;
	matchScorecards!: Table<MatchScorecard, string>;

	constructor() {
		super("shooting-logbook");

		this.version(1).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials: "id, type, validUntil, reminderDate, updatedAt",
		});

		this.version(2).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
		});

		this.version(3).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
		});

		this.version(4).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
		});

		this.version(5).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
		});

		this.version(6).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			matchStageAssets:
				"id, matchEventId, internalStageId, sourceFileName, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
		});

		this.version(7).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			matchStageAssets:
				"id, matchEventId, internalStageId, sourceFileName, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			reloadingBullets: "id, name, weightGrains, updatedAt",
			reloadingPowders: "id, name, updatedAt",
			reloadingRecipes: "id, caliber, bulletId, powderId, updatedAt",
			chronographSessions: "id, recipeId, firearmId, date, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
		});

		this.version(8).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			matchStageAssets:
				"id, matchEventId, internalStageId, sourceFileName, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			reloadingBullets: "id, name, weightGrains, updatedAt",
			reloadingPowders: "id, name, updatedAt",
			reloadingPrimers: "id, name, type, updatedAt",
			reloadingRecipes: "id, caliber, bulletId, powderId, primerId, updatedAt",
			chronographSessions: "id, recipeId, firearmId, date, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
		});

		this.version(9).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			matchStageAssets:
				"id, matchEventId, internalStageId, sourceFileName, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			reloadingBullets: "id, name, weightGrains, updatedAt",
			reloadingPowders: "id, name, updatedAt",
			reloadingPrimers: "id, name, type, updatedAt",
			reloadingBrass: "id, name, caliber, updatedAt",
			reloadingRecipes:
				"id, caliber, bulletId, powderId, primerId, brassId, updatedAt",
			chronographSessions: "id, recipeId, firearmId, date, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
		});

		this.version(10).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			matchStageAssets:
				"id, matchEventId, internalStageId, sourceFileName, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			reloadingBullets: "id, name, weightGrains, updatedAt",
			reloadingPowders: "id, name, updatedAt",
			reloadingPrimers: "id, name, type, updatedAt",
			reloadingBrass: "id, name, caliber, updatedAt",
			reloadingRecipes:
				"id, caliber, bulletId, powderId, primerId, brassId, updatedAt",
			chronographSessions: "id, recipeId, firearmId, date, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
			regularCompetitors: "id, displayName, updatedAt",
			matchAnalysisSelections: "matchEventId, updatedAt",
		});

		this.version(11).stores({
			firearms: "id, nickname, caliber, archived, updatedAt",
			trainingSessions: "id, date, firearmId, discipline, updatedAt",
			matchEvents: "id, date, firearmId, discipline, updatedAt",
			practiscoreMatchImports:
				"id, matchEventId, practiscoreMatchId, importedAt, updatedAt",
			matchStageAssets:
				"id, matchEventId, internalStageId, sourceFileName, updatedAt",
			matchScorecards: "id, mare2MatchId, dateFrom, dateTo, updatedAt",
			ammunitionBatches: "id, caliber, updatedAt",
			ammoTransactions:
				"id, batchId, caliber, type, date, linkedEntityType, linkedEntityId, updatedAt",
			reloadingBullets: "id, name, weightGrains, updatedAt",
			reloadingPowders: "id, name, updatedAt",
			reloadingPrimers: "id, name, type, updatedAt",
			reloadingBrass: "id, name, caliber, updatedAt",
			reloadingRecipes:
				"id, caliber, bulletId, powderId, primerId, brassId, updatedAt",
			chronographSessions: "id, recipeId, firearmId, date, updatedAt",
			maintenanceEvents: "id, firearmId, date, type, updatedAt",
			paperworkCredentials:
				"id, title, type, validUntil, reminderDate, updatedAt",
			paperworkAttachments: "id, credentialId, fileName, mimeType, updatedAt",
			appSettings: "id, updatedAt",
			regularCompetitors: "id, displayName, updatedAt",
			matchAnalysisSelections: "matchEventId, updatedAt",
		});
	}
}

export const db = new LogbookDatabase();
