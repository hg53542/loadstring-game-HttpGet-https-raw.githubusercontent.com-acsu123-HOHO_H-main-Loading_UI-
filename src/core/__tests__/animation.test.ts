import { describe, expect, it } from 'vitest';
import { AnimationController } from '../animation/AnimationController';
import { BLINK_DURATION, BLINK_MAX_INTERVAL } from '../animation/layers/blink';
import { GESTURE_DEFS } from '../animation/layers/gestures';
import { createRestPose } from '../animation/math';
import { EXPRESSIONS, GESTURES, HUMAN_BONES, type Pose } from '../animation/types';

const FPS = 60;
const DT = 1 / FPS;

/** Roda o controlador por `seconds` e devolve todas as poses. */
function run(ctrl: AnimationController, seconds: number): Pose[] {
  const out: Pose[] = [];
  for (let i = 0; i < Math.round(seconds * FPS); i++) out.push(ctrl.update(DT));
  return out;
}

const isFinitePose = (p: Pose) =>
  HUMAN_BONES.every((b) => [p.bones[b].x, p.bones[b].y, p.bones[b].z].every(Number.isFinite)) &&
  EXPRESSIONS.every((e) => Number.isFinite(p.expressions[e]));

describe('AnimationController — respiração', () => {
  it('oscila o peito no ritmo configurado', () => {
    const ctrl = new AnimationController({ seed: 1, settings: { breathingRate: 15, headMotion: 0, autoBlink: false } });
    const poses = run(ctrl, 8); // 15/min => 4s por ciclo => 2 ciclos
    const breath = poses.map((p) => p.breath);
    expect(Math.max(...breath)).toBeGreaterThan(0.95);
    expect(Math.min(...breath)).toBeLessThan(0.05);
    // Conta picos de inspiração (um por ciclo)
    let cycles = 0;
    for (let i = 1; i < breath.length - 1; i++) {
      if (breath[i]! > breath[i - 1]! && breath[i]! >= breath[i + 1]!) cycles++;
    }
    expect(cycles).toBe(2);
  });

  it('intensidade 0 desliga a respiração', () => {
    const ctrl = new AnimationController({ seed: 1, settings: { breathingIntensity: 0, headMotion: 0, idleMotion: 0 } });
    const rest = createRestPose();
    for (const p of run(ctrl, 3)) {
      expect(p.breath).toBe(0);
      expect(p.bones.chest.x).toBeCloseTo(rest.bones.chest.x, 6);
    }
  });
});

describe('AnimationController — piscadas', () => {
  it('pisca sozinho dentro do intervalo máximo e reabre os olhos', () => {
    const ctrl = new AnimationController({ seed: 42 });
    const poses = run(ctrl, BLINK_MAX_INTERVAL + 1);
    const values = poses.map((p) => p.expressions.blink);
    expect(Math.max(...values)).toBeGreaterThan(0.9);
    expect(values.at(-1)).toBeLessThan(0.05);
    expect(ctrl.blink.count).toBeGreaterThanOrEqual(1);
  });

  it('cada piscada dura cerca de BLINK_DURATION', () => {
    const ctrl = new AnimationController({ seed: 3, settings: { autoBlink: false } });
    ctrl.triggerBlink();
    let closedFrames = 0;
    for (const p of run(ctrl, 1)) if (p.expressions.blink > 0) closedFrames++;
    expect(closedFrames / FPS).toBeCloseTo(BLINK_DURATION, 1);
  });

  it('com piscada automática desligada só pisca quando mandado', () => {
    const ctrl = new AnimationController({ seed: 7, settings: { autoBlink: false } });
    run(ctrl, 15);
    expect(ctrl.blink.count).toBe(0);
    ctrl.triggerBlink();
    run(ctrl, 0.5);
    expect(ctrl.blink.count).toBe(1);
  });

  it('pisca entre 4 e 25 vezes por minuto (faixa humana)', () => {
    const ctrl = new AnimationController({ seed: 99 });
    run(ctrl, 60);
    expect(ctrl.blink.count).toBeGreaterThanOrEqual(4);
    expect(ctrl.blink.count).toBeLessThanOrEqual(25);
  });
});

describe('AnimationController — cabeça e olhar', () => {
  it('move a cabeça em modo idle dentro de limites naturais', () => {
    const ctrl = new AnimationController({ seed: 5 });
    const yaws = run(ctrl, 20).map((p) => p.bones.head.y + p.bones.neck.y);
    expect(Math.max(...yaws) - Math.min(...yaws)).toBeGreaterThan(0.05);
    expect(Math.max(...yaws.map(Math.abs))).toBeLessThan(0.5);
  });

  it('em modo câmera o olhar converge para o centro', () => {
    const ctrl = new AnimationController({ seed: 5, settings: { lookMode: 'camera', headMotion: 0 } });
    const last = run(ctrl, 4).at(-1)!;
    expect(Math.abs(ctrl.head.gaze.yaw)).toBeLessThan(0.01);
    expect(Math.abs(last.bones.head.y)).toBeLessThan(0.01);
  });
});

describe('AnimationController — emoções', () => {
  it('transiciona suavemente para a emoção pedida', () => {
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.setEmotion('happy');
    const first = ctrl.update(DT);
    expect(first.expressions.happy).toBeGreaterThan(0);
    expect(first.expressions.happy).toBeLessThan(0.2); // não é instantâneo
    const later = run(ctrl, 2).at(-1)!;
    expect(later.expressions.happy).toBeGreaterThan(0.95);
    expect(ctrl.emotion.dominant).toBe('happy');
  });

  it('trocar de emoção desliga a anterior', () => {
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.setEmotion('angry');
    run(ctrl, 2);
    ctrl.setEmotion('sad', 0.5);
    const p = run(ctrl, 3).at(-1)!;
    expect(p.expressions.angry).toBeLessThan(0.02);
    expect(p.expressions.sad).toBeCloseTo(0.5, 1);
  });
});

describe('AnimationController — gestos', () => {
  it.each(GESTURES)('gesto "%s" altera a pose e termina sozinho', (g) => {
    const ctrl = new AnimationController({ seed: 1, settings: { breathingIntensity: 0, headMotion: 0, idleMotion: 0, autoBlink: false } });
    const before = structuredClone(ctrl.update(DT));
    ctrl.playGesture(g);
    const poses = run(ctrl, GESTURE_DEFS[g].duration + 0.2);
    const mid = poses[Math.floor(poses.length / 2)]!;
    const diff = HUMAN_BONES.reduce(
      (acc, b) =>
        acc +
        Math.abs(mid.bones[b].x - before.bones[b].x) +
        Math.abs(mid.bones[b].y - before.bones[b].y) +
        Math.abs(mid.bones[b].z - before.bones[b].z),
      0,
    ) + Math.abs(mid.hipsOffsetY - before.hipsOffsetY);
    expect(diff).toBeGreaterThan(0.01);
    expect(ctrl.gestures.active).toBeNull();
    const end = poses.at(-1)!;
    for (const b of HUMAN_BONES) expect(end.bones[b].z).toBeCloseTo(before.bones[b].z, 3);
  });
});

describe('AnimationController — transformação demoníaca', () => {
  it('sobe gradualmente até 1 e volta a 0', () => {
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.setDemon(1);
    expect(ctrl.update(DT).demon).toBeLessThan(0.1);
    expect(run(ctrl, 6).at(-1)!.demon).toBeCloseTo(1, 3);
    ctrl.setDemon(0);
    expect(run(ctrl, 6).at(-1)!.demon).toBeCloseTo(0, 3);
  });

  it('limita valores fora de [0,1]', () => {
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.setDemon(7);
    expect(ctrl.demon.target).toBe(1);
    ctrl.setDemon(-3);
    expect(ctrl.demon.target).toBe(0);
  });
});

describe('AnimationController — robustez', () => {
  it('é determinístico com a mesma semente', () => {
    const a = run(new AnimationController({ seed: 123 }), 5).at(-1);
    const b = run(new AnimationController({ seed: 123 }), 5).at(-1);
    expect(a).toEqual(b);
  });

  it('tolera dt inválido ou enorme e mantém expressões em [0,1]', () => {
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.setEmotion('surprised');
    ctrl.playGesture('celebrate');
    for (const dt of [NaN, -1, Infinity, 5, 0, DT]) {
      const p = ctrl.update(dt);
      expect(isFinitePose(p)).toBe(true);
      for (const e of EXPRESSIONS) {
        expect(p.expressions[e]).toBeGreaterThanOrEqual(0);
        expect(p.expressions[e]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('sanitiza configurações inválidas', () => {
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.updateSettings({ breathingRate: 9999, headMotion: -5, lookMode: 'xyz' as never });
    expect(ctrl.settings.breathingRate).toBe(40);
    expect(ctrl.settings.headMotion).toBe(0);
    expect(ctrl.settings.lookMode).toBe('idle');
  });
});
