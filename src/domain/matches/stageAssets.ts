export interface MatchStageAsset {
	id: string;
	matchEventId: string;
	internalStageId: string;
	sourceFileName: string;
	sourcePageNumber: number;
	courseType?: string;
	minRounds?: number;
	maxPoints?: number;
	mimeType: string;
	size: number;
	content: Blob;
	createdAt: string;
	updatedAt: string;
}
