import crypto from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateApiKey, parseCfgContent, persistApiKeyHash } from './api-key-config.js';

const created: string[] = [];

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'uclaw-browse-key-'));
  created.push(dir);
  return dir;
}

afterEach(() => {
  while (created.length) {
    const dir = created.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('api key config helpers', () => {
  it('generate new key persists API_KEY_HASH into cfg file', () => {
    const dir = makeTempDir();
    const cfgFile = join(dir, 'unraidclaw-browse.cfg');
    writeFileSync(cfgFile, 'PORT="9876"\nHOST="0.0.0.0"\n');

    const key = generateApiKey();
    const result = persistApiKeyHash(cfgFile, key);
    const parsed = parseCfgContent(readFileSync(cfgFile, 'utf-8'));
    const expectedHash = crypto.createHash('sha256').update(key).digest('hex');

    expect(key).toHaveLength(64);
    expect(result.hash).toBe(expectedHash);
    expect(parsed.API_KEY_HASH).toBe(expectedHash);
    expect(parsed.PORT).toBe('9876');
  });

  it('accepts a valid custom key and writes its hash', () => {
    const dir = makeTempDir();
    const cfgFile = join(dir, 'unraidclaw-browse.cfg');
    const customKey = 'custom-key-1234567890';

    const result = persistApiKeyHash(cfgFile, customKey);
    const parsed = parseCfgContent(readFileSync(cfgFile, 'utf-8'));

    expect(parsed.API_KEY_HASH).toBe(result.hash);
    expect(result.hashPrefix).toBe(result.hash.slice(0, 16));
  });

  it('rejects a custom key that is too short', () => {
    const dir = makeTempDir();
    const cfgFile = join(dir, 'unraidclaw-browse.cfg');
    expect(() => persistApiKeyHash(cfgFile, 'too-short')).toThrow('Key too short');
  });

  it('rejects an empty custom key', () => {
    const dir = makeTempDir();
    const cfgFile = join(dir, 'unraidclaw-browse.cfg');
    expect(() => persistApiKeyHash(cfgFile, '   ')).toThrow('No key provided');
  });

  it('fails gracefully when cfg path is invalid', () => {
    const dir = makeTempDir();
    const cfgFile = join(dir, 'unraidclaw-browse.cfg');
    mkdirSync(cfgFile);

    expect(() => persistApiKeyHash(cfgFile, 'custom-key-1234567890')).toThrow('Cannot read config');
  });
});
