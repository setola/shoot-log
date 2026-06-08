import { db } from '../../db/schema';
import { nowIso } from '../../utils/time';
import type { AmmunitionBatch, AmmoTransaction, AmmoTransactionType } from './types';

export interface AmmunitionFormValues { caliber: string; brand?: string; bulletWeight?: string; lotNumber?: string; quantity: string; cost?: string; date: string; notes?: string; }
export interface AmmoTransactionFormValues { batchId?: string; caliber: string; type: AmmoTransactionType; quantity: string; cost?: string; date: string; notes?: string; }

export function createEmptyAmmunitionForm(): AmmunitionFormValues { return { caliber: '', brand: '', bulletWeight: '', lotNumber: '', quantity: '0', cost: '', date: new Date().toISOString().slice(0, 10), notes: '' }; }
export function createEmptyAmmoTransactionForm(): AmmoTransactionFormValues { return { batchId: '', caliber: '', type: 'added', quantity: '0', cost: '', date: new Date().toISOString().slice(0, 10), notes: '' }; }
export function ammunitionToFormValues(batch: AmmunitionBatch, stock: number): AmmunitionFormValues { return { ...batch, quantity: String(stock), cost: '', date: batch.createdAt.slice(0, 10), notes: batch.notes ?? '' }; }

export async function createAmmunitionBatch(values: AmmunitionFormValues): Promise<string> {
  const now = nowIso(); const id = crypto.randomUUID();
  await db.transaction('rw', [db.ammunitionBatches, db.ammoTransactions], async () => {
    await db.ammunitionBatches.add({ id, caliber: values.caliber.trim(), brand: optional(values.brand), bulletWeight: optional(values.bulletWeight), lotNumber: optional(values.lotNumber), notes: optional(values.notes), createdAt: now, updatedAt: now });
    const quantity = Number(values.quantity) || 0;
    if (quantity) await db.ammoTransactions.add({ id: crypto.randomUUID(), batchId: id, caliber: values.caliber.trim(), type: 'added', quantity, cost: numberOrUndefined(values.cost), linkedEntityType: 'manual', date: values.date, notes: optional(values.notes), createdAt: now, updatedAt: now });
  });
  return id;
}
export async function updateAmmunitionBatch(id: string, values: AmmunitionFormValues): Promise<void> { await db.ammunitionBatches.update(id, { caliber: values.caliber.trim(), brand: optional(values.brand), bulletWeight: optional(values.bulletWeight), lotNumber: optional(values.lotNumber), notes: optional(values.notes), updatedAt: nowIso() }); }
export async function deleteAmmunitionBatch(id: string): Promise<void> { await db.transaction('rw', [db.ammunitionBatches, db.ammoTransactions], async () => { await db.ammunitionBatches.delete(id); await db.ammoTransactions.where('batchId').equals(id).delete(); }); }
export async function createAmmoTransaction(values: AmmoTransactionFormValues): Promise<string> { const now = nowIso(); const id = crypto.randomUUID(); await db.ammoTransactions.add({ id, batchId: optional(values.batchId), caliber: values.caliber.trim(), type: values.type, quantity: Number(values.quantity) || 0, cost: numberOrUndefined(values.cost), linkedEntityType: 'manual', date: values.date, notes: optional(values.notes), createdAt: now, updatedAt: now }); return id; }
export async function deleteAmmoTransaction(id: string): Promise<void> { await db.ammoTransactions.delete(id); }
export function computeBatchStock(transactions: AmmoTransaction[], batchId?: string, caliber?: string): number { return transactions.filter((tx) => (batchId ? tx.batchId === batchId : tx.caliber === caliber)).reduce((sum, tx) => sum + (tx.type === 'used' ? -tx.quantity : tx.quantity), 0); }
function optional(value?: string): string | undefined { const trimmed = value?.trim(); return trimmed ? trimmed : undefined; }
function numberOrUndefined(value?: string): number | undefined { const n = Number(value); return Number.isFinite(n) && value !== '' ? n : undefined; }
