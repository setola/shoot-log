import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parsePractiscoreCabSnapshot } from './practiscoreParser';
import { calculateStagePlacementTrend } from './practiscoreAnalysis';
import type { PractiscoreImportRecord } from './practiscoreTypes';

async function loadSampleImport(): Promise<PractiscoreImportRecord> {
  const bytes = await readFile('test-data/match-imports/WinMSS.cab');
  const snapshot = await parsePractiscoreCabSnapshot(new File([bytes], 'WinMSS.cab'), '{82B59923-3BEF-4503-8CE7-DC70A25397F3}');

  return {
    id: 'sample',
    matchEventId: 'sample-match',
    practiscoreMatchId: snapshot.practiscoreMatchId,
    sourceFileName: snapshot.sourceFileName,
    importedAt: snapshot.importedAt,
    createdAt: snapshot.importedAt,
    updatedAt: snapshot.importedAt,
    snapshot
  };
}

describe('PractiScore analysis', () => {
  it('calculates stage placement by hit factor within the competitor division', async () => {
    const record = await loadSampleImport();
    const tessore = record.snapshot.competitors.find((competitor) => competitor.alias === 'IT027386');

    expect(tessore?.displayName).toBe('TESSORE EMANUELE');

    const trend = calculateStagePlacementTrend(record, tessore);
    const stageSix = trend.find((point) => point.stageId === '6');

    expect(stageSix).toMatchObject({ stageName: 'Stage 6', placement: 12 });
  });
});
