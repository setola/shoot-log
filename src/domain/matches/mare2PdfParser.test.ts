import { describe, expect, it } from 'vitest';
import { parseMare2TextSnapshot } from './mare2PdfParser';

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
`;

describe('Mare2 PDF parser', () => {
  it('parses score verification text into the analysis snapshot shape', () => {
    const snapshot = parseMare2TextSnapshot(mare2Text, 'results.pdf');

    expect(snapshot.match.name).toBe('6^ PROVA CAMPIONATO FEDERALE - MA3');
    expect(snapshot.match.date).toBe('2026-06-07');
    expect(snapshot.practiscoreMatchId).toMatch(/^mare2:/);
    expect(snapshot.competitors).toHaveLength(2);
    expect(snapshot.stages).toEqual([
      expect.objectContaining({ internalStageId: '1', maxPoints: 50, minRounds: 10 }),
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
