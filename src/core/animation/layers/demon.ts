import { clamp01, damp } from '../math';
import type { Pose } from '../types';

/**
 * Transformação demoníaca. O valor caminha suavemente até o alvo; durante a
 * transição o corpo "treme" de tensão, proporcional à distância até o alvo.
 */
export class DemonLayer {
  value = 0;
  target = 0;
  private time = 0;

  set(target: number) {
    this.target = clamp01(target);
  }

  get transforming() {
    return Math.abs(this.target - this.value) > 0.01;
  }

  update(dt: number) {
    this.time += dt;
    this.value = damp(this.value, this.target, 1.6, dt);
    if (Math.abs(this.value - this.target) < 1e-4) this.value = this.target;
  }

  apply(pose: Pose) {
    const v = this.value;
    const tension = Math.min(1, Math.abs(this.target - this.value) * 3);
    pose.demon = v;
    // Postura mais imponente.
    pose.bones.chest.x -= 0.05 * v;
    pose.bones.head.x += 0.03 * v; // queixo baixo, olhar por cima
    pose.bones.leftUpperArm.z += 0.12 * v;
    pose.bones.rightUpperArm.z -= 0.12 * v;
    pose.expressions.angry += 0.25 * v;
    // Tremor durante a transformação.
    const shake = Math.sin(this.time * 47) * 0.02 * tension;
    pose.bones.chest.z += shake;
    pose.bones.head.y += shake * 0.7;
  }
}
