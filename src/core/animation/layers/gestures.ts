import { envelope } from '../math';
import type { GestureName, Pose } from '../types';

/**
 * Gestos procedurais. Cada gesto recebe:
 *  - p: progresso normalizado [0,1]
 *  - w: envelope (entra e sai suavemente)
 *  - t: tempo absoluto do gesto em segundos (para oscilações)
 *
 * Lembrete das convenções: braço ESQUERDO sobe com Z+ e vai para frente com Y−;
 * braço DIREITO sobe com Z− e vai para frente com Y+.
 */
type GestureFn = (pose: Pose, p: number, w: number, t: number) => void;

interface GestureDef {
  duration: number;
  edge?: number;
  fn: GestureFn;
}

export const GESTURE_DEFS: Record<GestureName, GestureDef> = {
  wave: {
    duration: 2.4,
    fn: (pose, _p, w, t) => {
      const b = pose.bones;
      // Ângulos obtidos por busca numérica: mão ao lado da cabeça, dentro do quadro "busto".
      b.rightUpperArm.z -= 1.1 * w;
      b.rightUpperArm.y += 0.7 * w;
      b.rightLowerArm.z -= 2.0 * w;
      b.rightLowerArm.y -= 0.6 * w;
      b.rightLowerArm.z += Math.sin(t * 11) * 0.35 * w; // abana a mão
      b.head.z -= 0.08 * w;
      b.chest.z -= 0.04 * w;
      pose.expressions.happy += 0.5 * w;
    },
  },
  nod: {
    duration: 1.2,
    edge: 0.1,
    fn: (pose, p, w) => {
      pose.bones.head.x += Math.max(0, Math.sin(p * Math.PI * 4)) * 0.22 * w;
      pose.bones.neck.x += Math.max(0, Math.sin(p * Math.PI * 4)) * 0.06 * w;
    },
  },
  shake: {
    duration: 1.4,
    edge: 0.1,
    fn: (pose, p, w) => {
      pose.bones.head.y += Math.sin(p * Math.PI * 6) * 0.28 * w;
      pose.bones.neck.y += Math.sin(p * Math.PI * 6) * 0.06 * w;
    },
  },
  laugh: {
    duration: 2.2,
    fn: (pose, _p, w, t) => {
      const shake = Math.sin(t * 18);
      const b = pose.bones;
      b.chest.x -= (0.1 + shake * 0.025) * w;
      b.head.x -= (0.18 + shake * 0.03) * w;
      b.leftShoulder.z += (0.04 + shake * 0.03) * w;
      b.rightShoulder.z -= (0.04 + shake * 0.03) * w;
      b.leftLowerArm.y -= 0.6 * w; // mãos na barriga
      b.rightLowerArm.y += 0.6 * w;
      pose.expressions.happy += 1 * w;
      pose.expressions.aa += (0.45 + 0.35 * shake) * w;
      pose.hipsOffsetY += Math.abs(shake) * 0.008 * w;
    },
  },
  celebrate: {
    duration: 2.6,
    fn: (pose, p, w) => {
      const b = pose.bones;
      b.leftUpperArm.z += 2.1 * w;
      b.rightUpperArm.z -= 2.1 * w;
      b.leftLowerArm.z += 0.3 * w;
      b.rightLowerArm.z -= 0.3 * w;
      b.head.x -= 0.15 * w;
      b.chest.x -= 0.06 * w;
      pose.hipsOffsetY += Math.abs(Math.sin(p * Math.PI * 4)) * 0.07 * w;
      pose.expressions.happy += 1 * w;
      pose.expressions.aa += 0.5 * w;
    },
  },
  think: {
    duration: 3,
    fn: (pose, _p, w, t) => {
      const b = pose.bones;
      // Mão no queixo (ângulos obtidos por busca numérica).
      b.rightUpperArm.z -= 0.5 * w;
      b.rightUpperArm.y += 1.6 * w;
      b.rightLowerArm.z -= 2.6 * w;
      b.rightLowerArm.y -= 0.6 * w;
      b.head.z += 0.1 * w;
      b.head.x += 0.06 * w;
      pose.lookAt.yaw += 0.25 * w;
      pose.lookAt.pitch += (0.15 + Math.sin(t * 2) * 0.03) * w;
      pose.expressions.relaxed += 0.3 * w;
    },
  },
  point: {
    duration: 1.8,
    fn: (pose, _p, w) => {
      const b = pose.bones;
      b.rightUpperArm.z -= 1.1 * w;
      b.rightUpperArm.y += 1.25 * w;
      b.rightLowerArm.y -= 0.25 * w;
      b.chest.y += 0.12 * w;
      b.head.x += 0.04 * w;
      pose.expressions.happy += 0.4 * w;
    },
  },
  shrug: {
    duration: 1.6,
    fn: (pose, _p, w) => {
      const b = pose.bones;
      b.leftShoulder.z += 0.18 * w;
      b.rightShoulder.z -= 0.18 * w;
      b.leftUpperArm.z += 0.15 * w;
      b.rightUpperArm.z -= 0.15 * w;
      b.leftLowerArm.y -= 1.0 * w;
      b.rightLowerArm.y += 1.0 * w;
      b.leftLowerArm.x -= 0.8 * w; // palmas para cima
      b.rightLowerArm.x -= 0.8 * w;
      b.head.z += 0.14 * w;
      pose.expressions.relaxed += 0.4 * w;
    },
  },
};

export class GestureLayer {
  active: { name: GestureName; t: number; duration: number } | null = null;

  play(name: GestureName) {
    this.active = { name, t: 0, duration: GESTURE_DEFS[name].duration };
  }

  stop() {
    this.active = null;
  }

  update(dt: number) {
    if (!this.active) return;
    this.active.t += dt;
    if (this.active.t >= this.active.duration) this.active = null;
  }

  apply(pose: Pose) {
    if (!this.active) return;
    const def = GESTURE_DEFS[this.active.name];
    const p = this.active.t / this.active.duration;
    def.fn(pose, p, envelope(p, def.edge ?? 0.2), this.active.t);
  }
}
