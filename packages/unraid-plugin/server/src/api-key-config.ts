import crypto from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface PersistApiKeyResult {
  hash: string;
  hashPrefix: string;
}

export function parseCfgContent(content: string): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqPos = line.indexOf('=');
    if (eqPos === -1) continue;
    const key = line.slice(0, eqPos).trim();
    const value = line.slice(eqPos + 1).trim().replace(/^['"]|['"]$/g, '');
    cfg[key] = value;
  }
  return cfg;
}

export function serializeCfgContent(cfg: Record<string, string>): string {
  return Object.entries(cfg)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n') + '\n';
}

export function validateCustomApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error('No key provided');
  }
  if (trimmed.length < 16) {
    throw new Error('Key too short (min 16 chars)');
  }
  return trimmed;
}

export function persistApiKeyHash(cfgFile: string, key: string): PersistApiKeyResult {
  const trimmedKey = validateCustomApiKey(key);
  let cfg: Record<string, string> = {};

  try {
    const raw = readFileSync(cfgFile, 'utf-8');
    cfg = parseCfgContent(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw new Error(`Cannot read config: ${cfgFile}`);
    }
  }

  const hash = crypto.createHash('sha256').update(trimmedKey).digest('hex');
  cfg.API_KEY_HASH = hash;

  mkdirSync(dirname(cfgFile), { recursive: true });
  try {
    writeFileSync(cfgFile, serializeCfgContent(cfg), { encoding: 'utf-8', mode: 0o600 });
  } catch {
    throw new Error(`Cannot write config: ${cfgFile}`);
  }

  return {
    hash,
    hashPrefix: hash.slice(0, 16),
  };
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
