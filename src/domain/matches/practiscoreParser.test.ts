import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { normalizePractiscoreMatchId, parsePractiscoreCabSnapshot } from './practiscoreParser';
import { normalizeImportedDiscipline, summarizeOwnerDivisionAndCategory } from './snapshotSummary';

describe('PractiScore parser', () => {
  it('normalizes PractiScore result URLs to UUIDs', () => {
    expect(normalizePractiscoreMatchId('https://practiscore.com/results/html/%7B82B59923-3BEF-4503-8CE7-DC70A25397F3%7D')).toBe('82B59923-3BEF-4503-8CE7-DC70A25397F3');
  });

  it('extracts match, stages, competitors and scores from a PractiScore CAB export', async () => {
    const bytes = await readFile('test-data/match-imports/WinMSS.cab');
    const file = new File([bytes], 'WinMSS.cab');
    const snapshot = await parsePractiscoreCabSnapshot(file, '{82B59923-3BEF-4503-8CE7-DC70A25397F3}');

    expect(snapshot.practiscoreMatchId).toBe('82B59923-3BEF-4503-8CE7-DC70A25397F3');
    expect(normalizeImportedDiscipline(snapshot)).toBe('IPSC');
    expect(snapshot.match.name).toBe('5^ PROVA CAMPIONATO FEDERALE - MA3');
    expect(snapshot.match.date).toBe('2026-05-31');
    expect(snapshot.stages).toHaveLength(8);
    expect(snapshot.competitors).toHaveLength(227);
    expect(snapshot.scores).toHaveLength(1695);
    expect(snapshot.stages[0]).toMatchObject({ internalStageId: '1', name: 'Stage 1', minRounds: 12, maxPoints: 60 });
    expect(snapshot.scores[0]).toMatchObject({ internalStageId: '1', internalMemberId: '1', shootTime: 13.67, finalScore: 50 });
    expect(summarizeOwnerDivisionAndCategory(snapshot, ['IT017946'])).toBe('Div: OPTICS');
  });
});
