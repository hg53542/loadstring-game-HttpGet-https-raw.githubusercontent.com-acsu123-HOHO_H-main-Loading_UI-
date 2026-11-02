import { damp, type Rng } from '../math';
import { type ExpressionName, type Pose } from '../types';

export type Visemes = Partial<Record<'aa' | 'ih' | 'ou' | 'ee' | 'oh', number>>;

/**
 * Corpo durante a fala: boca segue os visemas; cabeça acompanha o ritmo das sílabas;
 * sobrancelhas sobem nas ênfases; mãos fazem "gestos de batida" ocasionais.
 */
export class TalkLayer {
  visemes: Required<Visemes> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private target: Required<Visemes> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  /** Nível de fala suavizado (0 = calado). */
  level = 0;
  private prevLevel = 0;
  private nod = 0;
  private beat: { side: 1 | -1; t: number } | null = null;
  private beatTimer = 1.5;
  private time = 0;

  constructor(private rng: Rng) {}

  setVisemes(v: Visemes) {
    for (const k of Object.keys(this.target) as (keyof Visemes)[]) this.target[k] = Math.max(0, Math.min(1, v[k] ?? 0));
  }

  get speaking() {
    return this.level > 0.05;
  }

  update(dt: number) {
    this.time += dt;
    let sum = 0;
    for (const k of Object.keys(this.visemes) as (keyof Visemes)[]) {
      // Boca abre rápido e fecha um pouco mais devagar (mais natural).
      const speed = this.target[k] > this.visemes[k] ? 28 : 18;
      this.visemes[k] = damp(this.visemes[k], this.target[k], speed, dt);
      sum += this.visemes[k];
    }
    this.prevLevel = this.level;
    this.level = damp(this.level, Math.min(1, sum * 1.4), 6, dt);
    // Ênfase: subida rápida do nível => pequeno aceno de cabeça.
    const rise = Math.max(0, this.level - this.prevLevel) / Math.max(dt, 1e-3);
    this.nod = damp(this.nod, Math.min(1, rise * 0.25), 10, dt);

    if (this.beat) {
      this.beat.t += dt;
      if (this.beat.t > 0.7) this.beat = null;
    } else if (this.speaking) {
      this.beatTimer -= dt;
      if (this.beatTimer <= 0) {
        this.beat = { side: this.rng() < 0.5 ? 1 : -1, t: 0 };
        this.beatTimer = 1.8 + this.rng() * 3.2;
      }
    }
  }

  apply(pose: Pose) {
    for (const k of Object.keys(this.visemes) as ExpressionName[]) {
      pose.expressions[k] = Math.max(pose.expressions[k], this.visemes[k as keyof Visemes]);
    }
    const L = this.level;
    const t = this.time;
    pose.bones.head.x += this.nod * 0.06 - L * 0.015;
    pose.bones.head.y += Math.sin(t * 2.3) * 0.035 * L;
    pose.bones.head.z += Math.sin(t * 1.6 + 1) * 0.025 * L;
    pose.bones.chest.y += Math.sin(t * 1.1) * 0.02 * L;
    pose.expressions.browUp += this.nod * 0.5;
    if (this.beat) {
      const p = this.beat.t / 0.7;
      const w = Math.sin(p * Math.PI);
      const b = pose.bones;
      if (this.beat.side === 1) {
        b.leftLowerArm.y -= 0.9 * w;
        b.leftUpperArm.y -= 0.25 * w;
        b.leftLowerArm.x -= 0.5 * w; // palma para cima
      } else {
        b.rightLowerArm.y += 0.9 * w;
        b.rightUpperArm.y += 0.25 * w;
        b.rightLowerArm.x -= 0.5 * w;
      }
    }
  }
}
