/**
 * Física secundária (cabelo, capa, abas do casaco).
 *
 * Cada mecha é uma corrente de segmentos com ângulo de repouso. Cada segmento é
 * uma mola amortecida: volta ao repouso, mas é empurrado pela inércia quando a
 * raiz (cabeça/ombro) se move ou gira — exatamente o "atraso" que dá vida ao cabelo.
 * Ângulos em radianos, no plano da tela (2D), positivo = sentido anti-horário.
 */
export interface SpringChainOptions {
  segments: number;
  /** Rigidez (quanto mais alto, mais rápido volta). */
  stiffness?: number;
  /** Amortecimento (0–1 por segundo, alto = para de balançar logo). */
  damping?: number;
  /** Quanto o movimento da raiz "puxa" a mecha. */
  inertia?: number;
  /** Segmentos da ponta são mais moles (multiplicador da rigidez na ponta). */
  tipSoftness?: number;
}

export class SpringChain {
  readonly angles: Float32Array;
  readonly velocities: Float32Array;
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly inertia: number;
  private readonly tipSoftness: number;

  constructor(opts: SpringChainOptions) {
    this.angles = new Float32Array(opts.segments);
    this.velocities = new Float32Array(opts.segments);
    this.stiffness = opts.stiffness ?? 90;
    this.damping = opts.damping ?? 7;
    this.inertia = opts.inertia ?? 1;
    this.tipSoftness = opts.tipSoftness ?? 0.5;
  }

  /**
   * @param dt passo (s)
   * @param rootAccelX aceleração horizontal da raiz (unidades/s², positivo = direita)
   * @param rootAngVel velocidade angular da raiz (rad/s)
   * @param wind força lateral extra (vento, aura)
   */
  step(dt: number, rootAccelX: number, rootAngVel: number, wind = 0) {
    const n = this.angles.length;
    // Passos internos pequenos = estável mesmo com dt grande.
    const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < n; i++) {
        const tip = n > 1 ? i / (n - 1) : 0;
        const k = this.stiffness * (1 - tip * (1 - this.tipSoftness));
        // Inércia: raiz acelera para a direita => mecha fica para trás (gira no sentido oposto).
        const drive = (-rootAccelX * 0.02 - rootAngVel * 0.6) * this.inertia * (0.5 + tip) + wind * (0.3 + tip);
        const acc = -k * this.angles[i]! - this.damping * this.velocities[i]! + drive;
        this.velocities[i]! += acc * h;
        this.angles[i]! += this.velocities[i]! * h;
        // Limite para nunca dar "nó".
        if (this.angles[i]! > 1.2) this.angles[i] = 1.2;
        if (this.angles[i]! < -1.2) this.angles[i] = -1.2;
      }
    }
  }

  /** Ângulo acumulado até o segmento i (cada segmento herda o do anterior). */
  cumulative(i: number) {
    let a = 0;
    for (let j = 0; j <= i && j < this.angles.length; j++) a += this.angles[j]!;
    return a;
  }

  reset() {
    this.angles.fill(0);
    this.velocities.fill(0);
  }
}
