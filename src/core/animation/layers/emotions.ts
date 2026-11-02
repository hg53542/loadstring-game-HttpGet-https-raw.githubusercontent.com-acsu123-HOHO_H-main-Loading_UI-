import { clamp01, damp } from '../math';
import { EMOTIONS, type AnimationSettings, type Emotion, type ExpressionName, type Pose } from '../types';

interface EmotionDef {
  expressions: Partial<Record<ExpressionName, number>>;
  /** Ajustes de postura (radianos). */
  headX?: number;
  headZ?: number;
  chestX?: number;
  shoulders?: number;
  mouthOpen?: number;
}

/** Cada emoção = expressões faciais + linguagem corporal. */
export const EMOTION_DEFS: Record<Emotion, EmotionDef> = {
  neutral: { expressions: {} },
  happy: { expressions: { happy: 1 }, headX: -0.05, headZ: 0.06, chestX: -0.02 },
  angry: { expressions: { angry: 1 }, headX: 0.07, chestX: 0.03, shoulders: 0.04 },
  sad: { expressions: { sad: 1 }, headX: 0.16, headZ: -0.05, chestX: 0.07, shoulders: -0.05 },
  surprised: { expressions: { surprised: 1, oh: 0.5 }, headX: -0.08, chestX: -0.04, shoulders: 0.07 },
  relaxed: { expressions: { relaxed: 1 }, headZ: 0.08, chestX: 0.02, shoulders: -0.02 },
  // Personalidade do Levi
  confident: { expressions: { happy: 0.3, smirk: 0.45, focus: 0.3 }, headX: -0.07, chestX: -0.05, shoulders: -0.02 },
  teasing: { expressions: { happy: 0.45, smirk: 1, blinkRight: 0.35, browUp: 0.4 }, headX: -0.03, headZ: 0.12, chestX: -0.02 },
  focused: { expressions: { focus: 1, angry: 0.1 }, headX: 0.06, chestX: 0.03 },
  laughing: { expressions: { happy: 1, aa: 0.55 }, headX: -0.12, chestX: -0.06, shoulders: 0.03 },
};

/** Emoções com movimento contínuo próprio (ex.: rir sacode o corpo). */
function animatedExtras(e: Emotion, pose: Pose, w: number, t: number) {
  if (e === 'laughing') {
    const k = Math.sin(t * 15);
    pose.bones.chest.x -= Math.abs(k) * 0.03 * w;
    pose.bones.head.x -= Math.abs(k) * 0.04 * w;
    pose.bones.leftShoulder.z += Math.abs(k) * 0.03 * w;
    pose.bones.rightShoulder.z -= Math.abs(k) * 0.03 * w;
    pose.expressions.aa += k * 0.25 * w;
  } else if (e === 'teasing') {
    pose.bones.head.z += Math.sin(t * 1.7) * 0.03 * w; // balança a cabeça, provocando
  }
}

export class EmotionLayer {
  weights: Record<Emotion, number>;
  target: Emotion = 'neutral';
  intensity = 1;
  private time = 0;

  constructor() {
    this.weights = Object.fromEntries(EMOTIONS.map((e) => [e, e === 'neutral' ? 1 : 0])) as Record<Emotion, number>;
  }

  set(emotion: Emotion, intensity = 1) {
    this.target = emotion;
    this.intensity = clamp01(intensity);
  }

  update(dt: number, s: AnimationSettings) {
    this.time += dt;
    for (const e of EMOTIONS) {
      const goal = e === this.target ? (e === 'neutral' ? 1 : this.intensity) : 0;
      this.weights[e] = damp(this.weights[e], goal, s.emotionSpeed, dt);
    }
  }

  /** Emoção com maior peso no momento. */
  get dominant(): Emotion {
    let best: Emotion = 'neutral';
    for (const e of EMOTIONS) if (this.weights[e] > this.weights[best]) best = e;
    return best;
  }

  apply(pose: Pose) {
    for (const e of EMOTIONS) {
      const w = this.weights[e];
      if (e === 'neutral' || w < 1e-4) continue;
      const def = EMOTION_DEFS[e];
      for (const [name, v] of Object.entries(def.expressions) as [ExpressionName, number][]) {
        pose.expressions[name] += v * w;
      }
      pose.bones.head.x += (def.headX ?? 0) * w;
      pose.bones.head.z += (def.headZ ?? 0) * w;
      pose.bones.chest.x += (def.chestX ?? 0) * w;
      pose.bones.leftShoulder.z += (def.shoulders ?? 0) * w;
      pose.bones.rightShoulder.z -= (def.shoulders ?? 0) * w;
      animatedExtras(e, pose, w, this.time);
    }
  }
}
