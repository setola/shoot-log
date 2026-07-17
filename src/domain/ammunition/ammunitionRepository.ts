import { db } from "../../db/schema";
import { nowIso } from "../../utils/time";
import type {
	AmmoTransaction,
	AmmoTransactionType,
	AmmunitionBatch,
	ChronographSession,
	ReloadingBrass,
	ReloadingBullet,
	ReloadingPowder,
	ReloadingPrimer,
	ReloadingRecipe,
} from "./types";

export interface AmmunitionFormValues {
	caliber: string;
	brand?: string;
	bulletWeight?: string;
	lotNumber?: string;
	quantity: string;
	cost?: string;
	date: string;
	notes?: string;
}

export interface AmmoTransactionFormValues {
	batchId?: string;
	caliber: string;
	type: AmmoTransactionType;
	quantity: string;
	cost?: string;
	date: string;
	notes?: string;
}

export interface ReloadingBulletFormValues {
	brand: string;
	name: string;
	weightGrains: string;
	diameter: string;
	profile: string;
	notes: string;
}

export interface ReloadingPowderFormValues {
	brand: string;
	name: string;
	notes: string;
}

export interface ReloadingPrimerFormValues {
	brand: string;
	name: string;
	type: string;
	notes: string;
}

export interface ReloadingBrassFormValues {
	brand: string;
	name: string;
	caliber: string;
	timesFired: string;
	notes: string;
}

export interface ReloadingRecipeFormValues {
	name: string;
	caliber: string;
	bulletId: string;
	powderId: string;
	powderChargeGrains: string;
	minimumPowerFactor: string;
	oalMm: string;
	primerId: string;
	brassId: string;
	notes: string;
}

export interface ChronographSessionFormValues {
	recipeId: string;
	firearmId: string;
	date: string;
	location: string;
	temperatureC: string;
	humidityPercent: string;
	pressureHpa: string;
	readings: string;
	notes: string;
}

export function createEmptyAmmunitionForm(): AmmunitionFormValues {
	return {
		caliber: "",
		brand: "",
		bulletWeight: "",
		lotNumber: "",
		quantity: "0",
		cost: "",
		date: new Date().toISOString().slice(0, 10),
		notes: "",
	};
}

export function createEmptyAmmoTransactionForm(): AmmoTransactionFormValues {
	return {
		batchId: "",
		caliber: "",
		type: "added",
		quantity: "0",
		cost: "",
		date: new Date().toISOString().slice(0, 10),
		notes: "",
	};
}

export function createEmptyBulletForm(): ReloadingBulletFormValues {
	return {
		brand: "",
		name: "",
		weightGrains: "",
		diameter: "",
		profile: "",
		notes: "",
	};
}

export function createEmptyPowderForm(): ReloadingPowderFormValues {
	return { brand: "", name: "", notes: "" };
}

export function createEmptyPrimerForm(): ReloadingPrimerFormValues {
	return { brand: "", name: "", type: "", notes: "" };
}

export function createEmptyBrassForm(): ReloadingBrassFormValues {
	return { brand: "", name: "", caliber: "", timesFired: "", notes: "" };
}

export function createEmptyRecipeForm(): ReloadingRecipeFormValues {
	return {
		name: "",
		caliber: "",
		bulletId: "",
		powderId: "",
		powderChargeGrains: "",
		minimumPowerFactor: "125",
		oalMm: "",
		primerId: "",
		brassId: "",
		notes: "",
	};
}

export function createEmptyChronographForm(
	recipeId = "",
): ChronographSessionFormValues {
	return {
		recipeId,
		firearmId: "",
		date: new Date().toISOString().slice(0, 10),
		location: "",
		temperatureC: "",
		humidityPercent: "",
		pressureHpa: "",
		readings: "",
		notes: "",
	};
}

export function ammunitionToFormValues(
	batch: AmmunitionBatch,
	stock: number,
): AmmunitionFormValues {
	return {
		...batch,
		quantity: String(stock),
		cost: "",
		date: batch.createdAt.slice(0, 10),
		notes: batch.notes ?? "",
	};
}

export function bulletToFormValues(
	bullet: ReloadingBullet,
): ReloadingBulletFormValues {
	return {
		brand: bullet.brand ?? "",
		name: bullet.name,
		weightGrains: String(bullet.weightGrains),
		diameter: bullet.diameter ?? "",
		profile: bullet.profile ?? "",
		notes: bullet.notes ?? "",
	};
}

export function powderToFormValues(
	powder: ReloadingPowder,
): ReloadingPowderFormValues {
	return {
		brand: powder.brand ?? "",
		name: powder.name,
		notes: powder.notes ?? "",
	};
}

export function primerToFormValues(
	primer: ReloadingPrimer,
): ReloadingPrimerFormValues {
	return {
		brand: primer.brand ?? "",
		name: primer.name,
		type: primer.type ?? "",
		notes: primer.notes ?? "",
	};
}

export function brassToFormValues(
	brass: ReloadingBrass,
): ReloadingBrassFormValues {
	return {
		brand: brass.brand ?? "",
		name: brass.name,
		caliber: brass.caliber ?? "",
		timesFired: brass.timesFired ? String(brass.timesFired) : "",
		notes: brass.notes ?? "",
	};
}

export function recipeToFormValues(
	recipe: ReloadingRecipe,
): ReloadingRecipeFormValues {
	return {
		name: recipe.name,
		caliber: recipe.caliber,
		bulletId: recipe.bulletId,
		powderId: recipe.powderId,
		powderChargeGrains: String(recipe.powderChargeGrains),
		minimumPowerFactor: recipe.minimumPowerFactor
			? String(recipe.minimumPowerFactor)
			: "",
		oalMm: recipe.oalMm ? String(recipe.oalMm) : "",
		primerId: recipe.primerId ?? "",
		brassId: recipe.brassId ?? "",
		notes: recipe.notes ?? "",
	};
}

export async function createAmmunitionBatch(
	values: AmmunitionFormValues,
): Promise<string> {
	const now = nowIso();
	const id = crypto.randomUUID();
	await db.transaction(
		"rw",
		[db.ammunitionBatches, db.ammoTransactions],
		async () => {
			await db.ammunitionBatches.add({
				id,
				caliber: values.caliber.trim(),
				brand: optional(values.brand),
				bulletWeight: optional(values.bulletWeight),
				lotNumber: optional(values.lotNumber),
				notes: optional(values.notes),
				createdAt: now,
				updatedAt: now,
			});
			const quantity = Number(values.quantity) || 0;
			if (quantity) {
				await db.ammoTransactions.add({
					id: crypto.randomUUID(),
					batchId: id,
					caliber: values.caliber.trim(),
					type: "added",
					quantity,
					cost: numberOrUndefined(values.cost),
					linkedEntityType: "manual",
					date: values.date,
					notes: optional(values.notes),
					createdAt: now,
					updatedAt: now,
				});
			}
		},
	);
	return id;
}

export async function updateAmmunitionBatch(
	id: string,
	values: AmmunitionFormValues,
): Promise<void> {
	await db.ammunitionBatches.update(id, {
		caliber: values.caliber.trim(),
		brand: optional(values.brand),
		bulletWeight: optional(values.bulletWeight),
		lotNumber: optional(values.lotNumber),
		notes: optional(values.notes),
		updatedAt: nowIso(),
	});
}

export async function deleteAmmunitionBatch(id: string): Promise<void> {
	await db.transaction(
		"rw",
		[db.ammunitionBatches, db.ammoTransactions],
		async () => {
			await db.ammunitionBatches.delete(id);
			await db.ammoTransactions.where("batchId").equals(id).delete();
		},
	);
}

export async function createAmmoTransaction(
	values: AmmoTransactionFormValues,
): Promise<string> {
	const now = nowIso();
	const id = crypto.randomUUID();
	await db.ammoTransactions.add({
		id,
		batchId: optional(values.batchId),
		caliber: values.caliber.trim(),
		type: values.type,
		quantity: Number(values.quantity) || 0,
		cost: numberOrUndefined(values.cost),
		linkedEntityType: "manual",
		date: values.date,
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	});
	return id;
}

export async function deleteAmmoTransaction(id: string): Promise<void> {
	await db.ammoTransactions.delete(id);
}

export function computeBatchStock(
	transactions: AmmoTransaction[],
	batchId?: string,
	caliber?: string,
): number {
	return transactions
		.filter((tx) => (batchId ? tx.batchId === batchId : tx.caliber === caliber))
		.reduce(
			(sum, tx) => sum + (tx.type === "used" ? -tx.quantity : tx.quantity),
			0,
		);
}

export async function saveBullet(
	values: ReloadingBulletFormValues,
	id?: string,
): Promise<string> {
	const now = nowIso();
	const bulletId = id ?? crypto.randomUUID();
	const bullet = {
		id: bulletId,
		brand: optional(values.brand),
		name: values.name.trim(),
		weightGrains: Number(values.weightGrains) || 0,
		diameter: optional(values.diameter),
		profile: optional(values.profile),
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	};
	if (id)
		await db.reloadingBullets.update(id, {
			brand: bullet.brand,
			name: bullet.name,
			weightGrains: bullet.weightGrains,
			diameter: bullet.diameter,
			profile: bullet.profile,
			notes: bullet.notes,
			updatedAt: now,
		});
	else await db.reloadingBullets.add(bullet);
	return bulletId;
}

export async function deleteBullet(id: string): Promise<void> {
	await db.reloadingBullets.delete(id);
}

export async function savePowder(
	values: ReloadingPowderFormValues,
	id?: string,
): Promise<string> {
	const now = nowIso();
	const powderId = id ?? crypto.randomUUID();
	const powder = {
		id: powderId,
		brand: optional(values.brand),
		name: values.name.trim(),
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	};
	if (id)
		await db.reloadingPowders.update(id, {
			brand: powder.brand,
			name: powder.name,
			notes: powder.notes,
			updatedAt: now,
		});
	else await db.reloadingPowders.add(powder);
	return powderId;
}

export async function deletePowder(id: string): Promise<void> {
	await db.reloadingPowders.delete(id);
}

export async function savePrimer(
	values: ReloadingPrimerFormValues,
	id?: string,
): Promise<string> {
	const now = nowIso();
	const primerId = id ?? crypto.randomUUID();
	const primer = {
		id: primerId,
		brand: optional(values.brand),
		name: values.name.trim(),
		type: optional(values.type),
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	};
	if (id)
		await db.reloadingPrimers.update(id, {
			brand: primer.brand,
			name: primer.name,
			type: primer.type,
			notes: primer.notes,
			updatedAt: now,
		});
	else await db.reloadingPrimers.add(primer);
	return primerId;
}

export async function deletePrimer(id: string): Promise<void> {
	await db.reloadingPrimers.delete(id);
}

export async function saveBrass(
	values: ReloadingBrassFormValues,
	id?: string,
): Promise<string> {
	const now = nowIso();
	const brassId = id ?? crypto.randomUUID();
	const brass = {
		id: brassId,
		brand: optional(values.brand),
		name: values.name.trim(),
		caliber: optional(values.caliber),
		timesFired: numberOrUndefined(values.timesFired),
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	};
	if (id)
		await db.reloadingBrass.update(id, {
			brand: brass.brand,
			name: brass.name,
			caliber: brass.caliber,
			timesFired: brass.timesFired,
			notes: brass.notes,
			updatedAt: now,
		});
	else await db.reloadingBrass.add(brass);
	return brassId;
}

export async function deleteBrass(id: string): Promise<void> {
	await db.reloadingBrass.delete(id);
}

export async function saveRecipe(
	values: ReloadingRecipeFormValues,
	id?: string,
): Promise<string> {
	const now = nowIso();
	const recipeId = id ?? crypto.randomUUID();
	const recipe = {
		id: recipeId,
		name: values.name.trim(),
		caliber: values.caliber.trim(),
		bulletId: values.bulletId,
		powderId: values.powderId,
		powderChargeGrains: Number(values.powderChargeGrains) || 0,
		minimumPowerFactor: numberOrUndefined(values.minimumPowerFactor),
		oalMm: numberOrUndefined(values.oalMm),
		primerId: optional(values.primerId),
		brassId: optional(values.brassId),
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	};
	if (id)
		await db.reloadingRecipes.update(id, {
			name: recipe.name,
			caliber: recipe.caliber,
			bulletId: recipe.bulletId,
			powderId: recipe.powderId,
			powderChargeGrains: recipe.powderChargeGrains,
			minimumPowerFactor: recipe.minimumPowerFactor,
			oalMm: recipe.oalMm,
			primerId: recipe.primerId,
			brassId: recipe.brassId,
			notes: recipe.notes,
			updatedAt: now,
		});
	else await db.reloadingRecipes.add(recipe);
	return recipeId;
}

export async function deleteRecipe(id: string): Promise<void> {
	await db.transaction(
		"rw",
		[db.reloadingRecipes, db.chronographSessions],
		async () => {
			await db.reloadingRecipes.delete(id);
			await db.chronographSessions.where("recipeId").equals(id).delete();
		},
	);
}

export function chronographSessionToFormValues(
	session: ChronographSession,
): ChronographSessionFormValues {
	return {
		recipeId: session.recipeId,
		firearmId: session.firearmId ?? "",
		date: session.date,
		location: session.location ?? "",
		temperatureC:
			session.temperatureC !== undefined ? String(session.temperatureC) : "",
		humidityPercent:
			session.humidityPercent !== undefined
				? String(session.humidityPercent)
				: "",
		pressureHpa:
			session.pressureHpa !== undefined ? String(session.pressureHpa) : "",
		readings: session.readingsFps.join("\n"),
		notes: session.notes ?? "",
	};
}

export async function saveChronographSession(
	values: ChronographSessionFormValues,
	id?: string,
): Promise<string> {
	const readings = parseVelocityReadings(values.readings);
	if (!readings.length) throw new Error("No velocity readings.");
	const recipe = await db.reloadingRecipes.get(values.recipeId);
	if (!recipe) throw new Error("Recipe not found.");
	const bullet = await db.reloadingBullets.get(recipe.bulletId);
	if (!bullet) throw new Error("Bullet not found.");

	const stats = calculateChronographStats(readings, bullet.weightGrains);
	const now = nowIso();
	const sessionId = id ?? crypto.randomUUID();
	const session = {
		id: sessionId,
		recipeId: values.recipeId,
		firearmId: optional(values.firearmId),
		date: values.date,
		location: optional(values.location),
		temperatureC: numberOrUndefined(values.temperatureC),
		humidityPercent: numberOrUndefined(values.humidityPercent),
		pressureHpa: numberOrUndefined(values.pressureHpa),
		velocityUnit: "fps" as const,
		readingsFps: readings,
		averageFps: stats.averageFps,
		minFps: stats.minFps,
		maxFps: stats.maxFps,
		extremeSpreadFps: stats.extremeSpreadFps,
		powerFactor: stats.powerFactor,
		notes: optional(values.notes),
		createdAt: now,
		updatedAt: now,
	};
	if (id)
		await db.chronographSessions.update(id, {
			recipeId: session.recipeId,
			firearmId: session.firearmId,
			date: session.date,
			location: session.location,
			temperatureC: session.temperatureC,
			humidityPercent: session.humidityPercent,
			pressureHpa: session.pressureHpa,
			velocityUnit: session.velocityUnit,
			readingsFps: session.readingsFps,
			averageFps: session.averageFps,
			minFps: session.minFps,
			maxFps: session.maxFps,
			extremeSpreadFps: session.extremeSpreadFps,
			powerFactor: session.powerFactor,
			notes: session.notes,
			updatedAt: now,
		});
	else await db.chronographSessions.add(session);
	return sessionId;
}

export async function deleteChronographSession(id: string): Promise<void> {
	await db.chronographSessions.delete(id);
}

export function parseVelocityReadings(value: string): number[] {
	return value
		.split(/[\s,;]+/)
		.map((part) => Number(part.trim().replace(",", ".")))
		.filter((reading) => Number.isFinite(reading) && reading > 0);
}

export function calculateChronographStats(
	readings: number[],
	bulletWeightGrains: number,
) {
	const averageFps =
		readings.reduce((sum, reading) => sum + reading, 0) / readings.length;
	const minFps = Math.min(...readings);
	const maxFps = Math.max(...readings);
	return {
		averageFps,
		minFps,
		maxFps,
		extremeSpreadFps: maxFps - minFps,
		powerFactor: (bulletWeightGrains * averageFps) / 1000,
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
