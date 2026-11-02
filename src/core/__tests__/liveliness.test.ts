import { describe, expect, it } from 'vitest';
import { AnimationController } from '../animation/AnimationController';
import { createRestPose } from '../animation/math';
import { EMOTIONS } from '../animation/types';
import { LIVE2D_PARAMS, poseToLive2D } from '../params/live2dParams';
import { SpringChain } from '../physics/springChain';
import { buildTimeline, parseScript, sampleTimeline, shapeOf, timelineDuration, timeOfChar } from '../voice/visemes';

const run = (c: AnimationController, s: number) => {
  let p = c.update(0);
  for (let i = 0; i < Math.round(s * 60); i++) p = c.update(1 / 60);
  return p;
};

describe('Vida em silêncio (IdleLayer)', () => {
  it('o corpo muda de postura ao longo do tempo — nunca estátua', () => {
    const c = new AnimationController({ seed: 3, settings: { autoBlink: false } });
    const samples: number[] = [];
    for (let i = 0; i < 30; i++) samples.push(run(c, 1).bones.chest.y);
    const range = Math.max(...samples) - Math.min(...samples);
    expect(range).toBeGreaterThan(0.02);
    // ...mas sem exageros
    expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.2);
  });

  it('não se repete em ciclo curto (movimentos não mecânicos)', () => {
    const c = new AnimationController({ seed: 9 });
    const a = run(c, 5).bones.hips.z;
    const b = run(c, 5).bones.hips.z;
    const d = run(c, 5).bones.hips.z;
    expect(new Set([a.toFixed(4), b.toFixed(4), d.toFixed(4)]).size).toBe(3);
  });

  it('idleMotion 0 desliga as variações', () => {
    const c = new AnimationController({ seed: 3, settings: { idleMotion: 0, breathingIntensity: 0 } });
    expect(run(c, 10).bones.hips.z).toBeCloseTo(0, 6);
  });
});

describe('Emoções de personalidade', () => {
  it('todas as emoções convergem e produzem rosto diferente do neutro', () => {
    const neutral = poseToLive2D(run(new AnimationController({ seed: 1, settings: { autoBlink: false } }), 2));
    for (const e of EMOTIONS) {
      if (e === 'neutral') continue;
      const c = new AnimationController({ seed: 1, settings: { autoBlink: false } });
      c.setEmotion(e);
      const p = poseToLive2D(run(c, 2));
      const diff = LIVE2D_PARAMS.reduce((acc, k) => acc + Math.abs(p[k] - neutral[k]), 0);
      expect(diff, e).toBeGreaterThan(0.3);
    }
  });

  it('provocador = sorriso de canto; rindo = boca abrindo e fechando', () => {
    const c = new AnimationController({ seed: 1 });
    c.setEmotion('teasing');
    expect(poseToLive2D(run(c, 2)).ParamMouthSmirk).toBeGreaterThan(0.8);
    c.setEmotion('laughing');
    run(c, 2);
    const opens = Array.from({ length: 20 }, () => poseToLive2D(run(c, 0.05)).ParamMouthOpenY);
    expect(Math.max(...opens) - Math.min(...opens)).toBeGreaterThan(0.2);
  });
});

describe('Fala (TalkLayer)', () => {
  it('visemas abrem a boca e a cabeça acompanha a fala', () => {
    const c = new AnimationController({ seed: 2, settings: { idleMotion: 0, headMotion: 0 } });
    const quiet = run(c, 1);
    const yawQuiet: number[] = [];
    for (let i = 0; i < 30; i++) yawQuiet.push(run(c, 0.05).bones.head.y);
    c.setVisemes({ aa: 0.9 });
    const yawTalk: number[] = [];
    let p = quiet;
    for (let i = 0; i < 30; i++) yawTalk.push((p = run(c, 0.05)).bones.head.y);
    expect(p.expressions.aa).toBeGreaterThan(0.8);
    expect(c.getState().speaking).toBe(true);
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
    expect(spread(yawTalk)).toBeGreaterThan(spread(yawQuiet) + 0.01);
    c.setVisemes({});
    expect(run(c, 1).expressions.aa).toBeLessThan(0.05);
  });
});

describe('Visemas em português', () => {
  it('vogais têm formatos próprios e acentos abrem mais', () => {
    expect(shapeOf('a').shape).toBe('aa');
    expect(shapeOf('ó').shape).toBe('oh');
    expect(shapeOf('ã').shape).toBe('aa');
    expect(shapeOf('á').open).toBeGreaterThan(shapeOf('a').open);
    expect(shapeOf('m').shape).toBe('closed');
    expect(shapeOf('B').shape).toBe('closed');
  });

  it('linha do tempo: duração plausível e boca fecha no M', () => {
    const tl = buildTimeline('Fala, galera! Bem-vindos.');
    const d = timelineDuration(tl);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(4);
    const mSeg = tl.find((s) => s.shape === 'closed')!;
    const v = sampleTimeline(tl, (mSeg.start + mSeg.end) / 2 - 0.001);
    expect(Math.max(...Object.values(v))).toBeLessThan(0.5);
    const aSeg = tl.find((s) => s.shape === 'aa')!;
    expect(sampleTimeline(tl, aSeg.start + 0.01).aa).toBeGreaterThan(0.7);
    expect(Object.values(sampleTimeline(tl, d + 1)).every((x) => x === 0)).toBe(true);
  });

  it('velocidade maior encurta a fala e o alinhamento por caractere funciona', () => {
    const t1 = timelineDuration(buildTimeline('olá mundo', 1));
    const t2 = timelineDuration(buildTimeline('olá mundo', 2));
    expect(t2).toBeCloseTo(t1 / 2, 5);
    const tl = buildTimeline('olá mundo');
    expect(timeOfChar(tl, 4)).toBeGreaterThan(timeOfChar(tl, 1)!);
  });

  it('roteiro com etiquetas de emoção, gesto e risada automática', () => {
    expect(parseScript('[feliz] Fala, galera! [provocador][apontar] Duvido me vencer. kkkk')).toEqual([
      { text: 'Fala, galera!', emotion: 'happy', gesture: undefined },
      { text: 'Duvido me vencer. kkkk', emotion: 'teasing', gesture: 'point' },
    ]);
    expect(parseScript('hahaha que isso')[0]).toMatchObject({ emotion: 'laughing', gesture: 'laugh' });
    expect(parseScript('[xyz] texto')).toEqual([{ text: '[xyz] texto', emotion: undefined, gesture: undefined }]);
  });
});

describe('Parâmetros Live2D', () => {
  it('pose de descanso = rosto neutro, olhos abertos', () => {
    const p = poseToLive2D(createRestPose());
    expect(p.ParamEyeLOpen).toBe(1);
    expect(p.ParamMouthOpenY).toBe(0);
    expect(p.ParamAngleX).toBe(0);
    for (const k of LIVE2D_PARAMS) expect(Number.isFinite(p[k])).toBe(true);
  });

  it('piscar fecha; virar a cabeça vira o AngleX; demônio vai para ParamDemon', () => {
    const pose = createRestPose();
    pose.expressions.blink = 1;
    pose.bones.head.y = 0.3;
    pose.demon = 0.7;
    const p = poseToLive2D(pose);
    expect(p.ParamEyeLOpen).toBe(0);
    expect(p.ParamAngleX).toBeCloseTo(17.19, 1);
    expect(p.ParamDemon).toBeCloseTo(0.7);
  });

  it('valores sempre dentro das faixas', () => {
    const pose = createRestPose();
    pose.bones.head.y = 5;
    pose.expressions.happy = 1;
    pose.expressions.sad = 1;
    const p = poseToLive2D(pose);
    expect(p.ParamAngleX).toBe(30);
    expect(p.ParamMouthForm).toBeGreaterThanOrEqual(-1);
    expect(p.ParamMouthForm).toBeLessThanOrEqual(1);
  });
});

describe('SpringChain (cabelo/roupa)', () => {
  it('fica em repouso sem estímulo', () => {
    const c = new SpringChain({ segments: 4 });
    for (let i = 0; i < 120; i++) c.step(1 / 60, 0, 0);
    expect(Math.abs(c.cumulative(3))).toBeLessThan(1e-6);
  });

  it('balança contra o movimento da cabeça, a ponta mais que a raiz, e assenta depois', () => {
    const c = new SpringChain({ segments: 4 });
    for (let i = 0; i < 10; i++) c.step(1 / 60, 600, 0); // cabeça acelera para a direita
    expect(c.cumulative(3)).toBeLessThan(0); // mecha fica para trás (gira para a esquerda)
    expect(Math.abs(c.angles[3]!)).toBeGreaterThan(Math.abs(c.angles[0]!));
    for (let i = 0; i < 300; i++) c.step(1 / 60, 0, 0);
    expect(Math.abs(c.cumulative(3))).toBeLessThan(0.01);
  });

  it('é estável com dt grande (aba em segundo plano)', () => {
    const c = new SpringChain({ segments: 5, stiffness: 300 });
    c.step(0.5, 5000, 20);
    for (let i = 0; i < 5; i++) expect(Number.isFinite(c.angles[i]!)).toBe(true);
    expect(Math.abs(c.cumulative(4))).toBeLessThanOrEqual(6);
  });
});
