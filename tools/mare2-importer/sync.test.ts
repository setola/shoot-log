import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isMatchClosedBeforeCurrentWeek } from './index.mjs';

const run = promisify(execFile);

describe('Mare2 closed match policy', () => {
  it('fails instead of publishing an empty catalog from partial match directories', async () => {
    const server = createServer((_request, response) => response.end('<html></html>'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test server port');
    const directory = await mkdtemp(path.join(tmpdir(), 'mare2-empty-'));
    try {
      await mkdir(path.join(directory, 'matches', '1633', 'assets'), { recursive: true });
      const originalManifest = '{"matches":[],"recoveryMarker":true}';
      await writeFile(path.join(directory, 'manifest.json'), originalManifest);
      await expect(run(process.execPath, [
        'tools/mare2-importer/index.mjs', 'sync', `--out=${directory}`,
        '--year=2026', '--max-pages=1', '--request-delay-ms=0',
      ], { env: { ...process.env, MARE2_ORIGIN: `http://127.0.0.1:${address.port}` } }))
        .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('Refusing to publish an empty') });
      expect(await readFile(path.join(directory, 'manifest.json'), 'utf8')).toBe(originalManifest);
    } finally {
      server.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('closes last Sunday but keeps this Monday refreshable', () => {
    const now = new Date('2026-07-22T12:00:00Z');
    expect(isMatchClosedBeforeCurrentWeek('2026-07-19', now)).toBe(true);
    expect(isMatchClosedBeforeCurrentWeek('2026-07-20', now)).toBe(false);
    expect(isMatchClosedBeforeCurrentWeek('2026-07-26', now)).toBe(false);
  });

  it('uses the Italian Monday boundary, including the year boundary', () => {
    const now = new Date('2026-01-04T23:30:00Z');
    expect(isMatchClosedBeforeCurrentWeek('2026-01-04', now)).toBe(true);
    expect(isMatchClosedBeforeCurrentWeek('2026-01-05', now)).toBe(false);
    expect(isMatchClosedBeforeCurrentWeek('2025-12-31', now)).toBe(true);
  });

  it('does not freeze matches with missing dates', () => {
    expect(isMatchClosedBeforeCurrentWeek(undefined)).toBe(false);
    expect(isMatchClosedBeforeCurrentWeek('unknown')).toBe(false);
  });

  it('skips a previously imported closed match before requesting details or PDFs', async () => {
    const requests: string[] = [];
    const server = createServer((request, response) => {
      requests.push(request.url ?? '');
      response.end('<tr data-href="/front/match/details/1"><p>Closed match</p><p>01/01/2020 - 02/01/2020</p></tr>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test server port');
    const directory = await mkdtemp(path.join(tmpdir(), 'mare2-sync-'));
    try {
      const matchDir = path.join(directory, 'matches', '1');
      await mkdir(matchDir, { recursive: true });
      await writeFile(path.join(matchDir, 'match.json'), JSON.stringify({
        mare2MatchId: '1', name: 'Closed match', dateFrom: '2020-01-01', dateTo: '2020-01-02',
      }));
      const snapshot = '{"untouched":true}';
      await writeFile(path.join(matchDir, 'snapshot.json'), snapshot);
      const { stdout } = await run(process.execPath, [
        'tools/mare2-importer/index.mjs', 'sync', `--out=${directory}`,
        '--year=2020', '--max-pages=1', '--request-delay-ms=0',
      ], { env: { ...process.env, MARE2_ORIGIN: `http://127.0.0.1:${address.port}` } });
      expect(JSON.parse(stdout)).toMatchObject({ built: 0, skipped: 1, failed: [] });
      expect(requests).toEqual(['/front/match/archive?search_year=2020']);
      expect(await readFile(path.join(matchDir, 'snapshot.json'), 'utf8')).toBe(snapshot);

      // --force must reach the details page even for a closed match.
      requests.length = 0;
      await run(process.execPath, [
        'tools/mare2-importer/index.mjs', 'sync', `--out=${directory}`,
        '--year=2020', '--max-pages=1', '--request-delay-ms=0', '--force',
      ], { env: { ...process.env, MARE2_ORIGIN: `http://127.0.0.1:${address.port}` } });
      expect(requests).toEqual([
        '/front/match/archive?search_year=2020', '/front/match/details/1',
      ]);

      // A missing snapshot must not be mistaken for a completed import.
      await rm(path.join(matchDir, 'snapshot.json'));
      requests.length = 0;
      await run(process.execPath, [
        'tools/mare2-importer/index.mjs', 'sync', `--out=${directory}`,
        '--year=2020', '--max-pages=1', '--request-delay-ms=0',
      ], { env: { ...process.env, MARE2_ORIGIN: `http://127.0.0.1:${address.port}` } });
      expect(requests).toContain('/front/match/details/1');
    } finally {
      server.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
