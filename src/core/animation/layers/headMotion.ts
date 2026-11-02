import { damp, type Rng } from '../math';
import type { AnimationSettings, Pose } from '../types';

export const GAZE_MAX_YAW = 0.35;
export const GAZE_MAX_PITCH = 0.12;

/**
 * Olhar e movimento de cabeça.
 *  - Os olhos saltam rápido para novos pontos (sacadas), a cabeça segue mais devagar.
 *  - Um "drift" lento com senos de frequências incomensuráveis evita que pareça robótico.
 *  - Em modo 'camera' o alvo é sempre o centro (olhar para o público).
 */
export class HeadMotionLayer {
  gaze = { yaw: 0, pitch: 0 };
  head = { yaw: 0, pitch: 0 };
  target = { yaw: 0, pitch: 0 };
  private timer = 0;
  private time = 0;

  constructor(private rng: Rng) {}

  update(dt: number, s: AnimationSettings) {
    this.time += dt;
    if (s.lookMode === 'camera') {
      this.target.yaw = 0;
      this.target.pitch = 0;
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        // 40% das vezes volta para a câmera: apresentador fala com o público.
        const toCamera = this.rng() < 0.4;
        this.target.yaw = toCamera ? 0 : (this.rng() * 2 - 1) * GAZE_MAX_YAW;
        this.target.pitch = toCamera ? 0 : (this.rng() * 2 - 1) * GAZE_MAX_PITCH;
        this.timer = 1.2 + this.rng() * 3;
      }
    }
    this.gaze.yaw = damp(this.gaze.yaw, this.target.yaw, 14, dt);
    this.gaze.pitch = damp(this.gaze.pitch, this.target.pitch, 14, dt);
    this.head.yaw = damp(this.head.yaw, this.gaze.yaw, 2.5, dt);
    this.head.pitch = damp(this.head.pitch, this.gaze.pitch, 2.5, dt);
  }

  apply(pose: Pose, s: AnimationSettings) {
    const k = Math.max(0, s.headMotion);
    const t = this.time;
    const driftYaw = (Math.sin(t * 0.37) * 0.04 + Math.sin(t * 0.91) * 0.015) * k;
    const driftPitch = (Math.sin(t * 0.53 + 1.3) * 0.025 + Math.sin(t * 1.27) * 0.008) * k;
    const driftRoll = Math.sin(t * 0.29 + 0.7) * 0.03 * k;

    // A cabeça acompanha ~60% do olhar; o resto é feito pelos olhos.
    const yaw = this.head.yaw * 0.6 * Math.min(1, k) + driftYaw;
    const pitch = this.head.pitch * 0.6 * Math.min(1, k) + driftPitch;

    // Divide entre pescoço (40%) e cabeça (60%). Pitch positivo = olhar para cima = rotação X negativa.
    pose.bones.neck.y += yaw * 0.4;
    pose.bones.head.y += yaw * 0.6;
    pose.bones.neck.x -= pitch * 0.4;
    pose.bones.head.x -= pitch * 0.6;
    pose.bones.head.z += driftRoll;

    // Olhos: direção relativa à cabeça.
    pose.lookAt.yaw += this.gaze.yaw - yaw;
    pose.lookAt.pitch += this.gaze.pitch - pitch;
  }
}
