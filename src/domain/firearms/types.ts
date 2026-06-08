export type FirearmType = 'pistol' | 'revolver' | 'rifle' | 'shotgun' | 'airgun' | 'other';

export interface Firearm {
  id: string;
  nickname: string;
  manufacturer?: string;
  model?: string;
  type: FirearmType;
  caliber?: string;
  serialNumber?: string;
  acquisitionDate?: string;
  acquisitionReference?: string;
  initialRoundCount: number;
  archived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
