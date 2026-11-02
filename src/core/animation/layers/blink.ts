import { smoothstep, type Rng } from '../math';
import type { Pose } from '../types';

export const BLINK_DURATION = 0.16;
export const BLINK_MIN_INTERVAL = 1.8;
export const BLINK_MAX_INTERVAL = 6;
const DOUBLE_BLINK_CHANCE = 0.15;
const DOUBLE_BLINK_GAP = 0.12;

/** Piscadas automáticas em intervalos irregulares, com piscadas duplas ocasionais. */
export class BlinkLayer {
  private timer: number;
  /** Tempo decorrido dentro da piscada atual, ou -1 se os olhos estão abertos. */
  private t = -1;
  private pendingDouble = false;
  /** Contador de piscadas — útil para testes e telemetria. */
  count = 0;

  constructor(private rng: Rng) {
    this.timer = this.nextInterval();
  }

  private nextInterval() {
    return BLINK_MIN_INTERVAL + this.rng() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
  }

  private start() {
    this.t = 0;
    this.count++;
  }

  /** Força uma piscada agora (funciona mesmo com piscada automática desligada). */
  trigger() {
    if (this.t < 0) this.start();
  }

  get isBlinking() {
    return this.t >= 0;
  }

  update(dt: number, autoBlink: boolean) {
    if (this.t >= 0) {
      this.t += dt;
      if (this.t >= BLINK_DURATION) {
        this.t = -1;
        if (this.pendingDouble) {
          this.pendingDouble = false;
          this.timer = DOUBLE_BLINK_GAP;
        } else {
          this.timer = this.nextInterval();
        }
      }
      return;
    }
    if (!autoBlink) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.start();
      this.pendingDouble = this.rng() < DOUBLE_BLINK_CHANCE;
    }
  }

  /** 0 = aberto, 1 = fechado. Fecha em 40% do tempo e abre no restante. */
  get value() {
    if (this.t < 0) return 0;
    const p = this.t / BLINK_DURATION;
    return p < 0.4 ? smoothstep(p / 0.4) : 1 - smoothstep((p - 0.4) / 0.6);
  }

  apply(pose: Pose) {
    pose.expressions.blink = Math.max(pose.expressions.blink, this.value);
  }
}
