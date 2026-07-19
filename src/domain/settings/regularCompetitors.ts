import { db } from "../../db/schema";
import { createId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import {
	normalizeIdentifiers,
	parseIdentifierText,
} from "./settingsRepository";

export interface RegularCompetitor {
	id: string;
	displayName: string;
	identifiers: string[];
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface RegularCompetitorFormValues {
	displayName: string;
	identifiersText: string;
	notes: string;
}

export function createEmptyRegularCompetitorForm(): RegularCompetitorFormValues {
	return { displayName: "", identifiersText: "", notes: "" };
}

export function regularCompetitorToFormValues(
	record: RegularCompetitor,
): RegularCompetitorFormValues {
	return {
		displayName: record.displayName,
		identifiersText: record.identifiers.join("\n"),
		notes: record.notes ?? "",
	};
}

export async function saveRegularCompetitor(
	values: RegularCompetitorFormValues,
	id?: string,
): Promise<string> {
	const now = nowIso();
	const existing = id ? await db.regularCompetitors.get(id) : undefined;
	const record: RegularCompetitor = {
		id: id ?? createId(),
		displayName: values.displayName.trim(),
		identifiers: normalizeIdentifiers(
			parseIdentifierText(values.identifiersText),
		),
		notes: values.notes.trim() || undefined,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};
	await db.regularCompetitors.put(record);
	return record.id;
}

export async function deleteRegularCompetitor(id: string): Promise<void> {
	await db.regularCompetitors.delete(id);
}
