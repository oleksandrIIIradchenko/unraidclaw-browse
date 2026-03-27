import { describe, expect, it } from 'vitest';
import { Action } from './resources.js';
import { applyPreset, createDefaultMatrix, isPermitted, PRESET_LABELS, PRESETS } from './permissions.js';

describe('permissions helpers', () => {
  it('creates fully false or true matrices', () => {
    const none = createDefaultMatrix(false);
    const all = createDefaultMatrix(true);
    expect(Object.values(none).every((v) => v === false)).toBe(true);
    expect(Object.values(all).every((v) => v === true)).toBe(true);
  });

  it('read-only preset only enables read actions', () => {
    const ro = applyPreset('read-only');
    expect(Object.entries(ro).every(([key, value]) => !value || key.endsWith(`:${Action.READ}`))).toBe(true);
    expect(ro['docker:read']).toBe(true);
    expect(ro['docker:update']).toBe(false);
  });

  it('docker-manager preset enables docker control and basic reads', () => {
    const matrix = PRESETS['docker-manager'];
    expect(matrix['docker:create']).toBe(true);
    expect(matrix['docker:update']).toBe(true);
    expect(matrix['docker:delete']).toBe(true);
    expect(matrix['vms:update']).toBe(false);
    expect(matrix['info:read']).toBe(true);
  });

  it('isPermitted returns permission state', () => {
    const matrix = createDefaultMatrix(false);
    matrix['logs:read'] = true;
    expect(isPermitted(matrix, 'logs', 'read')).toBe(true);
    expect(isPermitted(matrix, 'docker', 'update')).toBe(false);
  });

  it('preset labels stay aligned', () => {
    expect(PRESET_LABELS['full-admin']).toBe('Full Admin');
    expect(Object.keys(PRESET_LABELS).sort()).toEqual(Object.keys(PRESETS).sort());
  });
});
