export type AmmoTransactionType = 'added' | 'used' | 'adjusted';

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
  linkedEntityType?: 'trainingSession' | 'matchEvent' | 'manual';
  linkedEntityId?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
