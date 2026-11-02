import type { AnimationSettings, Pose } from '../types';

/**
 * Respiração: peito sobe/expande, ombros sobem levemente, cabeça compensa.
 * Usa uma onda assimétrica (inspira mais rápido do que expira), como uma pessoa real.
 */
export class BreathingLayer {
  /** Fase normalizada do ciclo [0, 1). */
  phase = 0;

  update(dt: number, s: AnimationSettings) {
    const cyclesPerSecond = Math.max(0, s.breathingRate) / 60;
    this.phase = (this.phase + dt * cyclesPerSecond) % 1;
  }

  /** 0 = pulmões vazios, 1 = cheios. Inspiração ocupa 40% do ciclo. */
  get inhale() {
    const p = this.phase;
    const x = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
    return 0.5 - 0.5 * Math.cos(x * Math.PI);
  }

  apply(pose: Pose, s: AnimationSettings) {
    const k = Math.max(0, s.breathingIntensity);
    const b = this.inhale * k;
    const c = (this.inhale - 0.5) * k;
    pose.breath = b;
    pose.bones.spine.x -= 0.012 * c;
    pose.bones.chest.x -= 0.03 * c;
    pose.bones.upperChest.x -= 0.02 * c;
    pose.bones.neck.x += 0.025 * c; // mantém o rosto estável
    pose.bones.leftShoulder.z += 0.035 * b;
    pose.bones.rightShoulder.z -= 0.035 * b;
    pose.bones.leftUpperArm.z -= 0.02 * b; // braços acompanham sem "abrir"
    pose.bones.rightUpperArm.z += 0.02 * b;
    pose.hipsOffsetY += 0.004 * c;
  }
}
