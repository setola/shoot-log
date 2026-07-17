export type AmmoTransactionType = "added" | "used" | "adjusted";

export interface AmmunitionBatch {
	id: string;
	caliber: string;
	brand?: string;
	bulletWeight?: string;
	lotNumber?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AmmoTransaction {
	id: string;
	batchId?: string;
	caliber: string;
	type: AmmoTransactionType;
	quantity: number;
	cost?: number;
	linkedEntityType?: "trainingSession" | "matchEvent" | "manual";
	linkedEntityId?: string;
	date: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReloadingBullet {
	id: string;
	brand?: string;
	name: string;
	weightGrains: number;
	diameter?: string;
	profile?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReloadingPowder {
	id: string;
	brand?: string;
	name: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReloadingPrimer {
	id: string;
	brand?: string;
	name: string;
	type?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReloadingBrass {
	id: string;
	brand?: string;
	name: string;
	caliber?: string;
	timesFired?: number;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReloadingRecipe {
	id: string;
	name: string;
	caliber: string;
	bulletId: string;
	powderId: string;
	powderChargeGrains: number;
	minimumPowerFactor?: number;
	oalMm?: number;
	primerId?: string;
	primer?: string;
	brassId?: string;
	brass?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ChronographSession {
	id: string;
	recipeId: string;
	firearmId?: string;
	date: string;
	location?: string;
	temperatureC?: number;
	humidityPercent?: number;
	pressureHpa?: number;
	velocityUnit: "fps";
	readingsFps: number[];
	averageFps: number;
	minFps: number;
	maxFps: number;
	extremeSpreadFps: number;
	powerFactor: number;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}
