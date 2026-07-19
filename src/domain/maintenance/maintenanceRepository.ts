import { db } from "../../db/schema";
import { createId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type { MaintenanceEvent, MaintenanceType } from "./types";

export interface MaintenanceFormValues {
	firearmId: string;
	date: string;
	roundCountAtMaintenance?: string;
	type: MaintenanceType;
	partsReplaced?: string;
	cost?: string;
	notes?: string;
	nextReminderAt?: string;
	nextReminderRoundCount?: string;
}
export function createEmptyMaintenanceForm(): MaintenanceFormValues {
	return {
		firearmId: "",
		date: new Date().toISOString().slice(0, 10),
		roundCountAtMaintenance: "",
		type: "cleaning",
		partsReplaced: "",
		cost: "",
		notes: "",
		nextReminderAt: "",
		nextReminderRoundCount: "",
	};
}
export function maintenanceToFormValues(
	record: MaintenanceEvent,
): MaintenanceFormValues {
	return {
		...record,
		roundCountAtMaintenance: record.roundCountAtMaintenance
			? String(record.roundCountAtMaintenance)
			: "",
		cost: record.cost ? String(record.cost) : "",
		nextReminderRoundCount: record.nextReminderRoundCount
			? String(record.nextReminderRoundCount)
			: "",
	};
}
export async function createMaintenanceEvent(
	values: MaintenanceFormValues,
): Promise<string> {
	const now = nowIso();
	const id = createId();
	await db.maintenanceEvents.add({
		id,
		...normalize(values),
		createdAt: now,
		updatedAt: now,
	});
	return id;
}
export async function updateMaintenanceEvent(
	id: string,
	values: MaintenanceFormValues,
): Promise<void> {
	await db.maintenanceEvents.update(id, {
		...normalize(values),
		updatedAt: nowIso(),
	});
}
export async function deleteMaintenanceEvent(id: string): Promise<void> {
	await db.maintenanceEvents.delete(id);
}
function normalize(
	values: MaintenanceFormValues,
): Omit<MaintenanceEvent, "id" | "createdAt" | "updatedAt"> {
	return {
		firearmId: values.firearmId,
		date: values.date,
		roundCountAtMaintenance: numberOrUndefined(values.roundCountAtMaintenance),
		type: values.type,
		partsReplaced: optional(values.partsReplaced),
		cost: numberOrUndefined(values.cost),
		notes: optional(values.notes),
		nextReminderAt: optional(values.nextReminderAt),
		nextReminderRoundCount: numberOrUndefined(values.nextReminderRoundCount),
	};
}
function optional(value?: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}
function numberOrUndefined(value?: string): number | undefined {
	const n = Number(value);
	return Number.isFinite(n) && value !== "" ? n : undefined;
}
