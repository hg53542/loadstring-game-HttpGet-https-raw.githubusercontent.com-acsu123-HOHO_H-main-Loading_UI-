import { describe, expect, it } from 'vitest';
import { AnimationController } from '../animation/AnimationController';
import { applyAnimationCommand, parseCommand } from '../control/commands';

describe('parseCommand', () => {
  it('aceita comandos válidos', () => {
    expect(parseCommand({ type: 'emotion', emotion: 'happy', intensity: 0.5 })).toEqual({
      type: 'emotion',
      emotion: 'happy',
      intensity: 0.5,
    });
    expect(parseCommand({ type: 'gesture', gesture: 'wave' })).toEqual({ type: 'gesture', gesture: 'wave' });
    expect(parseCommand({ type: 'blink' })).toEqual({ type: 'blink' });
    expect(parseCommand({ type: 'demon', value: 1 })).toEqual({ type: 'demon', value: 1 });
    expect(parseCommand({ type: 'camera', preset: 'busto' })).toEqual({ type: 'camera', preset: 'busto' });
    expect(parseCommand({ type: 'lighting', preset: 'demoniaco' })).toEqual({ type: 'lighting', preset: 'demoniaco' });
  });

  it('rejeita lixo e valores desconhecidos', () => {
    for (const raw of [
      null,
      42,
      'blink',
      {},
      { type: 'nuke' },
      { type: 'emotion', emotion: 'furioso' },
      { type: 'emotion', emotion: 'happy', intensity: 'muito' },
      { type: 'gesture', gesture: 'backflip' },
      { type: 'demon', value: '1' },
      { type: 'demon', value: NaN },
      { type: 'camera', preset: 'drone' },
      { type: 'settings', patch: { foo: 1 } },
      { type: 'settings', patch: null },
    ]) {
      expect(parseCommand(raw)).toBeNull();
    }
  });

  it('filtra campos desconhecidos de settings', () => {
    expect(parseCommand({ type: 'settings', patch: { autoBlink: false, evil: true, breathingRate: 'x' } })).toEqual({
      type: 'settings',
      patch: { autoBlink: false },
    });
  });
});

describe('applyAnimationCommand', () => {
  it('encaminha comandos de animação ao controlador', () => {
    const ctrl = new AnimationController({ seed: 1 });
    expect(applyAnimationCommand(ctrl, { type: 'emotion', emotion: 'angry' })).toBe(true);
    expect(ctrl.emotion.target).toBe('angry');
    applyAnimationCommand(ctrl, { type: 'gesture', gesture: 'nod' });
    expect(ctrl.gestures.active?.name).toBe('nod');
    applyAnimationCommand(ctrl, { type: 'demon', value: 0.5 });
    expect(ctrl.demon.target).toBe(0.5);
    applyAnimationCommand(ctrl, { type: 'settings', patch: { autoBlink: false } });
    expect(ctrl.settings.autoBlink).toBe(false);
  });

  it('não consome comandos de câmera/iluminação (são da cena)', () => {
    const ctrl = new AnimationController({ seed: 1 });
    expect(applyAnimationCommand(ctrl, { type: 'camera', preset: 'rosto' })).toBe(false);
    expect(applyAnimationCommand(ctrl, { type: 'lighting', preset: 'estudio' })).toBe(false);
  });
});
