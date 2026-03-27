import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const created: string[] = [];

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'uclaw-browse-config-'));
  created.push(dir);
  return dir;
}

afterEach(() => {
  delete process.env.FLASH_BASE;
  delete process.env.OCC_PORT;
  delete process.env.OCC_HOST;
  delete process.env.OCC_API_KEY_HASH;
  delete process.env.OCC_GRAPHQL_URL;
  delete process.env.OCC_UNRAID_API_KEY;
  delete process.env.OCC_LOG_FILE;
  delete process.env.OCC_MAX_LOG_SIZE;
  delete process.env.OCC_TLS_CERT;
  delete process.env.OCC_TLS_KEY;
  vi.resetModules();
  while (created.length) {
    const dir = created.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('config', () => {
  it('loads config from unraidclaw-browse.cfg under FLASH_BASE', async () => {
    const dir = makeTempDir();
    process.env.FLASH_BASE = dir;
    writeFileSync(join(dir, 'unraidclaw-browse.cfg'), [
      'PORT="9999"',
      'HOST="127.0.0.1"',
      'API_KEY_HASH="abc123"',
      'GRAPHQL_URL="http://localhost:81/graphql"',
      'UNRAID_API_KEY="secret"',
      'LOG_FILE="/tmp/test.jsonl"',
      'MAX_LOG_SIZE="2048"',
      'TLS_CERT="/tmp/cert.pem"',
      'TLS_KEY="/tmp/key.pem"',
    ].join('\n'));

    const mod = await import('./config.js');
    const cfg = mod.loadConfig();
    expect(cfg.port).toBe(9999);
    expect(cfg.host).toBe('127.0.0.1');
    expect(cfg.apiKeyHash).toBe('abc123');
    expect(cfg.graphqlUrl).toBe('http://localhost:81/graphql');
    expect(cfg.unraidApiKey).toBe('secret');
    expect(cfg.logFile).toBe('/tmp/test.jsonl');
    expect(cfg.maxLogSize).toBe(2048);
    expect(cfg.tlsCert).toBe('/tmp/cert.pem');
    expect(cfg.tlsKey).toBe('/tmp/key.pem');
  });

  it('falls back to env vars when cfg is missing', async () => {
    const dir = makeTempDir();
    process.env.FLASH_BASE = dir;
    process.env.OCC_PORT = '1234';
    process.env.OCC_HOST = '0.0.0.0';
    process.env.OCC_API_KEY_HASH = 'envhash';
    process.env.OCC_GRAPHQL_URL = 'http://localhost/graphql';
    process.env.OCC_UNRAID_API_KEY = 'envkey';
    process.env.OCC_LOG_FILE = '/tmp/env-log.jsonl';
    process.env.OCC_MAX_LOG_SIZE = '4096';
    process.env.OCC_TLS_CERT = '/tmp/env-cert.pem';
    process.env.OCC_TLS_KEY = '/tmp/env-key.pem';

    const mod = await import('./config.js');
    const cfg = mod.loadConfig();
    expect(cfg.port).toBe(1234);
    expect(cfg.apiKeyHash).toBe('envhash');
    expect(cfg.unraidApiKey).toBe('envkey');
    expect(cfg.logFile).toBe('/tmp/env-log.jsonl');
    expect(cfg.maxLogSize).toBe(4096);
  });

  it('creates default permissions.json when missing', async () => {
    const dir = makeTempDir();
    process.env.FLASH_BASE = dir;
    const mod = await import('./config.js');
    const matrix = mod.loadPermissions();
    const file = join(dir, 'permissions.json');
    expect(existsSync(file)).toBe(true);
    expect(typeof matrix['docker:read']).toBe('boolean');
    const raw = JSON.parse(readFileSync(file, 'utf-8'));
    expect(raw['docker:read']).toBe(false);
  });

  it('falls back to default matrix when permissions file is invalid JSON', async () => {
    const dir = makeTempDir();
    process.env.FLASH_BASE = dir;
    writeFileSync(join(dir, 'permissions.json'), '{not-json');
    const mod = await import('./config.js');
    const matrix = mod.loadPermissions();
    expect(matrix['docker:read']).toBe(false);
    expect(matrix['array:update']).toBe(false);
  });

  it('ignores unknown permission keys from permissions file', async () => {
    const dir = makeTempDir();
    process.env.FLASH_BASE = dir;
    writeFileSync(join(dir, 'permissions.json'), JSON.stringify({ 'docker:read': true, 'fake:perm': true }, null, 2));
    const mod = await import('./config.js');
    const matrix = mod.loadPermissions();
    expect(matrix['docker:read']).toBe(true);
    expect((matrix as Record<string, boolean | undefined>)['fake:perm']).toBeUndefined();
  });
});
