import { db } from './schema';

export const repositories = {
  firearms: db.firearms,
  trainingSessions: db.trainingSessions,
  matchEvents: db.matchEvents,
  ammunitionBatches: db.ammunitionBatches,
  ammoTransactions: db.ammoTransactions,
  maintenanceEvents: db.maintenanceEvents,
  paperworkCredentials: db.paperworkCredentials
};
