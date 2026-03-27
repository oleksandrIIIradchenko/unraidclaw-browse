import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listDirectory, safeResolveUnderRoot } from './fs-browse.js';

const created: string[] = [];
function makeTree() {
  const dir = mkdtempSync(join(tmpdir(), 'uclaw-browse-fs-'));
  created.push(dir);
  mkdirSync(join(dir, 'alpha'));
  mkdirSync(join(dir, 'beta'));
  writeFileSync(join(dir, 'zeta.txt'), 'hello');
  writeFileSync(join(dir, '.hidden'), 'nope');
  writeFileSync(join(dir, 'alpha', 'a.txt'), 'a');
  return dir;
}

afterEach(() => {
  while (created.length) {
    const dir = created.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('fs-browse', () => {
  it('rejects path traversal', async () => {
    const root = makeTree();
    await expect(safeResolveUnderRoot(root, '/../etc')).rejects.toMatchObject({ code: 'INVALID_PATH' });
    await expect(safeResolveUnderRoot(root, '..\\etc')).rejects.toMatchObject({ code: 'INVALID_PATH' });
  });

  it('rejects symlink escapes outside root', async () => {
    const root = makeTree();
    const outside = mkdtempSync(join(tmpdir(), 'uclaw-outside-'));
    created.push(outside);
    symlinkSync(outside, join(root, 'escape-link'));
    await expect(safeResolveUnderRoot(root, '/escape-link')).rejects.toMatchObject({ code: 'INVALID_PATH' });
  });

  it('rejects overly long browse paths', async () => {
    const root = makeTree();
    await expect(safeResolveUnderRoot(root, '/' + 'a'.repeat(5000))).rejects.toMatchObject({ code: 'INVALID_PATH' });
  });

  it('lists directories first and hides dotfiles by default', async () => {
    const root = makeTree();
    const result = await listDirectory(root, '/');
    expect(result.entries.map((e) => e.name)).toEqual(['alpha', 'beta', 'zeta.txt']);
    expect(result.entries.find((e) => e.name === '.hidden')).toBeUndefined();
  });

  it('can include hidden files and limit output', async () => {
    const root = makeTree();
    const result = await listDirectory(root, '/', { includeHidden: true, limit: 2 });
    expect(result.entries.length).toBe(2);
    expect(result.truncated).toBe(true);
  });

  it('supports dirsOnly mode', async () => {
    const root = makeTree();
    const result = await listDirectory(root, '/', { dirsOnly: true });
    expect(result.entries.every((e) => e.type === 'directory')).toBe(true);
  });

  it('returns breadcrumbs, sorting and pagination metadata', async () => {
    const root = makeTree();
    writeFileSync(join(root, 'small.txt'), '1');
    writeFileSync(join(root, 'large.txt'), '123456789');
    const result = await listDirectory(root, '/', { sortBy: 'size', order: 'desc', limit: 2, offset: 1, includeHidden: true });
    expect(result.breadcrumbs).toEqual([{ name: 'root', path: '/' }]);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(1);
    expect(result.sortBy).toBe('size');
    expect(result.order).toBe('desc');
    expect(result.total).toBeGreaterThan(2);
    expect(result.entries.length).toBe(2);
  });
});
