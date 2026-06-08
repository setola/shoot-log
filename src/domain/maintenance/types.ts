export type MaintenanceType = 'cleaning' | 'lubrication' | 'inspection' | 'repair' | 'partReplacement' | 'gunsmith' | 'other';

export interface MaintenanceEvent {
  id: string;
  firearmId: string;
  date: string;
  roundCountAtMaintenance?: number;
  type: MaintenanceType;
  partsReplaced?: string;
  cost?: number;
  notes?: string;
  nextReminderAt?: string;
  nextReminderRoundCount?: number;
  createdAt: string;
  updatedAt: string;
}
