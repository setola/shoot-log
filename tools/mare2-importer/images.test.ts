import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { convertToWebp } from './index.mjs';

describe('Mare2 image conversion', () => {
  it('uses convert when ImageMagick 7 magick is unavailable (Ubuntu ImageMagick 6)', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mare2-images-'));
    try {
      const source = path.join(directory, 'source.jpg');
      const target = path.join(directory, 'result.webp');
      await writeFile(source, 'fixture');
      const commands: string[] = [];
      await convertToWebp(source, target, true, async (command: string) => {
        commands.push(command);
        if (command === 'magick') throw Object.assign(new Error('spawn magick ENOENT'), { code: 'ENOENT' });
        await writeFile(target, 'converted');
      });
      expect(commands).toEqual(['magick', 'convert']);
      expect(await readFile(target, 'utf8')).toBe('converted');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps the real conversion error rather than reporting a misleading JPG fallback', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mare2-images-'));
    try {
      const source = path.join(directory, 'source.jpg');
      await writeFile(source, 'invalid image');
      await expect(convertToWebp(source, path.join(directory, 'result.webp'), true, async () => {
        throw new Error('invalid JPEG data');
      })).rejects.toThrow('invalid JPEG data');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
