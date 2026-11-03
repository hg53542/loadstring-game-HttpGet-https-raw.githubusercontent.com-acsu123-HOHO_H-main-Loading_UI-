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

describe('parseCommand — efeitos e clipes', () => {
  it('aceita fx, presets e clipes válidos', () => {
    expect(parseCommand({ type: 'fx', effect: 'lightning', intensity: 0.5 })).toEqual({ type: 'fx', effect: 'lightning', intensity: 0.5 });
    expect(parseCommand({ type: 'fxPreset', preset: 'dominio' })).toEqual({ type: 'fxPreset', preset: 'dominio', intensity: undefined });
    expect(parseCommand({ type: 'clip', action: 'play', id: 'presente-grande' })).toEqual({ type: 'clip', action: 'play', id: 'presente-grande' });
    expect(parseCommand({ type: 'clip', action: 'skip' })).toEqual({ type: 'clip', action: 'skip' });
  });

  it('rejeita efeitos desconhecidos e ids de clipe perigosos', () => {
    for (const raw of [
      { type: 'fx', effect: 'nuke' },
      { type: 'fxPreset', preset: 'apocalipse' },
      { type: 'clip', action: 'play', id: '../../etc/passwd' },
      { type: 'clip', action: 'play', id: 'Clip Com Espaço' },
      { type: 'clip', action: 'play' },
      { type: 'clip', action: 'delete' },
    ]) {
      expect(parseCommand(raw)).toBeNull();
    }
  });
});

describe('parseCommand — fala e modo de avatar', () => {
  it('aceita fala válida e troca de modo', () => {
    expect(parseCommand({ type: 'speak', text: '[feliz] Fala, galera!' })).toEqual({ type: 'speak', text: '[feliz] Fala, galera!' });
    expect(parseCommand({ type: 'speakStop' })).toEqual({ type: 'speakStop' });
    expect(parseCommand({ type: 'avatar', mode: '25d' })).toEqual({ type: 'avatar', mode: '25d' });
  });
  it('rejeita fala vazia, gigante ou não-texto e modos desconhecidos', () => {
    expect(parseCommand({ type: 'speak', text: '   ' })).toBeNull();
    expect(parseCommand({ type: 'speak', text: 'a'.repeat(601) })).toBeNull();
    expect(parseCommand({ type: 'speak', text: 42 })).toBeNull();
    expect(parseCommand({ type: 'avatar', mode: '4d' })).toBeNull();
  });
});

describe('parseCommand — cenário e figurino', () => {
  it('aceita valores conhecidos e rejeita o resto', () => {
    expect(parseCommand({ type: 'scene', scene: 'quarto' })).toEqual({ type: 'scene', scene: 'quarto' });
    expect(parseCommand({ type: 'outfit', outfit: 'guerreiro' })).toEqual({ type: 'outfit', outfit: 'guerreiro' });
    expect(parseCommand({ type: 'scene', scene: 'lua' })).toBeNull();
    expect(parseCommand({ type: 'outfit', outfit: 'pijama' })).toBeNull();
  });
});
