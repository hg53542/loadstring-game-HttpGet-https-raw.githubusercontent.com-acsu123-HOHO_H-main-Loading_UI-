import { describe, expect, it } from 'vitest';
import { parseUrlOptions } from './urlOptions';

describe('parseUrlOptions', () => {
  it('usa padrões seguros', () => {
    expect(parseUrlOptions('')).toEqual({ transparent: false, quality: 'media', camera: null, lighting: null, vrm: null, hideBadge: false, avatar: null, scene: null, outfit: null });
  });
  it('lê opções válidas', () => {
    const o = parseUrlOptions('?transparent=1&quality=baixa&camera=rosto&lighting=dramatico&vrm=/models/levi.vrm&nobadge');
    expect(o).toEqual({ transparent: true, quality: 'baixa', camera: 'rosto', lighting: 'dramatico', vrm: '/models/levi.vrm', hideBadge: true, avatar: null, scene: null, outfit: null });
  });
  it('ignora valores desconhecidos e VRM de outros sites', () => {
    const o = parseUrlOptions('?transparent=0&quality=ultra&camera=drone&vrm=https://evil.example/x.vrm');
    expect(o.transparent).toBe(false);
    expect(o.quality).toBe('media');
    expect(o.camera).toBeNull();
    expect(o.vrm).toBeNull();
    expect(parseUrlOptions('?vrm=//evil.example/x.vrm').vrm).toBeNull();
  });
});
