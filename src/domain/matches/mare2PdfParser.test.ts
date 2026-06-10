import { describe, expect, it } from 'vitest';
import { parseMare2TextSnapshot } from './mare2PdfParser';
import { normalizeImportedDiscipline, summarizeOwnerDivisionAndCategory, summarizeOwnerDivisionAndCategoryValue, summarizeSnapshotDivisionsAndCategories } from './snapshotSummary';

const mare2Text = `Score Verification By Competitor
6^ PROVA CAMPIONATO FEDERALE - MA3
Printed 07 giu 2026 a 17:41

100   GUERZONI, MASSIMO                  DIV: P        CLASS: C   FACTOR: Minor   CATEGORY: SS

  STG       FACTOR        PTS   A    C        D    Ded.     MI    NS     PE       OT   Time
  Stage 1   2,5451        48    6    6        0    0        0     0      0             18,86
  Stage 2   2,5997        60    12   0        0    0        0     0      0             23,08

101   MALINA, MARIJAN                    DIV: OP       CLASS: B   FACTOR: Minor   CATEGORY:

  STG       FACTOR        PTS   A    C        D    Ded.     MI    NS     PE       OT   Time
  Stage 1   2,9343        50    8    3        1    0        0     0      0             17,04
  Stage 2   3,6002        58    11   1        0    0        0     0      0             16,11

102   ROSSI, MARIO                       DIV: PCO      CLASS: A   FACTOR: Minor   CATEGORY: S

  STG       FACTOR        PTS   A    C        D    Ded.     MI    NS     PE       OT   Time
  Stage 1   3,4022        56    10   2        0    0        0     0      0             16,46

103   VERDI, LUIGI                       DIV: PCI      CLASS: A   FACTOR: Minor   CATEGORY:

  STG       FACTOR        PTS   A    C        D    Ded.     MI    NS     PE       OT   Time
  Stage 1   3,9022        58    10   4        0    0        0     0      0             14,86
`;

describe('Mare2 PDF parser', () => {
  it('parses score verification text into the analysis snapshot shape', () => {
    const snapshot = parseMare2TextSnapshot(mare2Text, 'results.pdf');

    expect(snapshot.match.name).toBe('6^ PROVA CAMPIONATO FEDERALE - MA3');
    expect(snapshot.match.date).toBe('2026-06-07');
    expect(snapshot.practiscoreMatchId).toMatch(/^mare2:/);
    expect(normalizeImportedDiscipline(snapshot)).toBe('IPSC');
    expect(snapshot.competitors).toHaveLength(4);
    expect(snapshot.competitors[0]).toEqual(expect.objectContaining({ divisionId: 'P', categoryId: 'SS' }));
    expect(snapshot.competitors[1]).toEqual(expect.objectContaining({ divisionId: 'OP', categoryId: undefined }));
    expect(snapshot.competitors[2]).toEqual(expect.objectContaining({ divisionId: 'PCO', categoryId: 'S' }));
    expect(snapshot.competitors[3]).toEqual(expect.objectContaining({ divisionId: 'PCI', categoryId: undefined }));
    expect(summarizeOwnerDivisionAndCategory(snapshot, ['GUERZONI, MASSIMO'])).toBe('Div: PRODUCTION · Cat: SS');
    expect(summarizeOwnerDivisionAndCategory(snapshot, ['101'])).toBe('Div: OPTICS');
    expect(summarizeOwnerDivisionAndCategoryValue(snapshot, ['GUERZONI, MASSIMO'])).toBe('PRODUCTION · SS');
    expect(summarizeOwnerDivisionAndCategoryValue(snapshot, ['ROSSI, MARIO'])).toBe('PCC OPTIC · S');
    expect(summarizeOwnerDivisionAndCategoryValue(snapshot, ['VERDI, LUIGI'])).toBe('PCC IRON');
    expect(summarizeSnapshotDivisionsAndCategories(snapshot)).toBe('Div: OPTICS, PCC IRON, PCC OPTIC, PRODUCTION · Cat: S, SS');
    expect(snapshot.stages).toEqual([
      expect.objectContaining({ internalStageId: '1', maxPoints: 58, minRounds: 12 }),
      expect.objectContaining({ internalStageId: '2', maxPoints: 60, minRounds: 12 })
    ]);
    expect(snapshot.scores[0]).toEqual(expect.objectContaining({
      internalMemberId: '100',
      internalStageId: '1',
      scoreA: 6,
      scoreC: 6,
      scoreD: 0,
      hitFactor: 2.5451,
      shootTime: 18.86,
      finalScore: 48
    }));
  });
});
