import { damp, type Rng } from '../math';
import type { Pose } from '../types';

/**
 * Vida em silêncio: o corpo nunca fica parado como estátua.
 *  - A cada 4–9 s escolhe uma nova "postura" (peso numa perna, tronco levemente
 *    torcido, ombro mais baixo, cabeça inclinada) e migra para ela devagar.
 *  - Por cima, um balanço contínuo de baixa amplitude com frequências que não se repetem.
 */
export class IdleLayer {
  private target = { hipsZ: 0, chestY: 0, chestZ: 0, headZ: 0, shoulderL: 0, shoulderR: 0, armL: 0, armR: 0 };
  private current = { ...this.target };
  private timer = 0;
  private time = 0;

  constructor(private rng: Rng) {}

  update(dt: number) {
    this.time += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      const r = () => this.rng() * 2 - 1;
      this.target = {
        hipsZ: r() * 0.035,
        chestY: r() * 0.06,
        chestZ: r() * 0.025,
        headZ: r() * 0.06,
        shoulderL: r() * 0.03,
        shoulderR: r() * 0.03,
        armL: r() * 0.06,
        armR: r() * 0.06,
      };
      this.timer = 4 + this.rng() * 5;
    }
    for (const k of Object.keys(this.current) as (keyof typeof this.current)[]) {
      this.current[k] = damp(this.current[k], this.target[k], 0.9, dt);
    }
  }

  apply(pose: Pose, k = 1) {
    const c = this.current;
    const t = this.time;
    const b = pose.bones;
    // Peso numa perna: quadril inclina, tronco compensa para o lado oposto.
    b.hips.z += c.hipsZ * k;
    b.spine.z -= c.hipsZ * 0.6 * k;
    b.chest.y += (c.chestY + Math.sin(t * 0.23) * 0.015) * k;
    b.chest.z += (c.chestZ + Math.sin(t * 0.31 + 2) * 0.008) * k;
    b.head.z += c.headZ * k;
    b.leftShoulder.z += c.shoulderL * k;
    b.rightShoulder.z -= c.shoulderR * k;
    // Braços balançam um pouquinho (nunca exatamente iguais).
    b.leftUpperArm.z += (c.armL + Math.sin(t * 0.41) * 0.02) * k;
    b.rightUpperArm.z -= (c.armR + Math.sin(t * 0.37 + 1) * 0.02) * k;
    b.leftLowerArm.y -= Math.max(0, Math.sin(t * 0.29)) * 0.08 * k;
    b.rightLowerArm.y += Math.max(0, Math.sin(t * 0.33 + 2)) * 0.08 * k;
  }
}
