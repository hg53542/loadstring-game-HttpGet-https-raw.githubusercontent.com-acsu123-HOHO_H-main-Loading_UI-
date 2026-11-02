import { EXPRESSIONS, HUMAN_BONES, type Euler3, type Pose } from './types';

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Suavização exponencial independente do frame rate. `speed` em 1/s. */
export const damp = (current: number, target: number, speed: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-speed * dt));

export const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Envelope 0→1→0 com entrada/saída suaves (fração `edge` em cada ponta). */
export const envelope = (p: number, edge = 0.2) => {
  if (p <= 0 || p >= 1) return 0;
  if (p < edge) return smoothstep(p / edge);
  if (p > 1 - edge) return smoothstep((1 - p) / edge);
  return 1;
};

export const addEuler = (target: Euler3, add: Partial<Euler3>, weight = 1) => {
  target.x += (add.x ?? 0) * weight;
  target.y += (add.y ?? 0) * weight;
  target.z += (add.z ?? 0) * weight;
};

/** Pose de descanso: braços abaixados a partir da T-pose, cotovelos levemente dobrados. */
export function createRestPose(): Pose {
  const bones = {} as Pose['bones'];
  for (const b of HUMAN_BONES) bones[b] = { x: 0, y: 0, z: 0 };
  bones.leftUpperArm.z = -1.2;
  bones.rightUpperArm.z = 1.2;
  bones.leftLowerArm.y = -0.25; // esquerdo: Y negativo = para frente
  bones.rightLowerArm.y = 0.25; // direito: Y positivo = para frente
  bones.leftLowerArm.z = -0.08;
  bones.rightLowerArm.z = 0.08;

  const expressions = {} as Pose['expressions'];
  for (const e of EXPRESSIONS) expressions[e] = 0;

  return { bones, expressions, lookAt: { yaw: 0, pitch: 0 }, hipsOffsetY: 0, demon: 0, breath: 0 };
}

/** Gerador pseudoaleatório determinístico (mulberry32) — deixa os testes reproduzíveis. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = () => number;
