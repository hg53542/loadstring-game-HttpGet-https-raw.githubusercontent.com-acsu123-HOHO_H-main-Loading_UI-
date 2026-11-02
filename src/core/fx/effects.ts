import { clamp01, envelope } from '../animation/math';

/**
 * Efeitos visuais de anime em tempo real. Este arquivo só calcula "quanto" de cada
 * efeito está ativo em cada instante; desenhar é papel de src/avatar/fx.
 */
export const FX_EFFECTS = ['speedLines', 'lightning', 'shatter', 'cosmos', 'flash', 'shake'] as const;
export type FxEffect = (typeof FX_EFFECTS)[number];

/** Combinações prontas = "momentos". */
export const FX_PRESETS = ['impacto', 'poder', 'explosao', 'dominio'] as const;
export type FxPreset = (typeof FX_PRESETS)[number];

interface FxDef {
  duration: number;
  /** Fração da duração usada para entrar/sair suavemente. */
  edge: number;
}

export const FX_DEFS: Record<FxEffect, FxDef> = {
  speedLines: { duration: 1.6, edge: 0.15 },
  lightning: { duration: 2.2, edge: 0.1 },
  shatter: { duration: 2.0, edge: 0.05 },
  cosmos: { duration: 6, edge: 0.15 },
  flash: { duration: 0.45, edge: 0.15 },
  shake: { duration: 0.8, edge: 0.1 },
};

/** Cada preset dispara efeitos com atraso (s) e intensidade. */
export const FX_PRESET_DEFS: Record<FxPreset, { label: string; steps: { effect: FxEffect; delay: number; intensity: number }[] }> = {
  impacto: {
    label: '💥 Impacto',
    steps: [
      { effect: 'flash', delay: 0, intensity: 0.8 },
      { effect: 'shake', delay: 0, intensity: 1 },
      { effect: 'speedLines', delay: 0, intensity: 1 },
    ],
  },
  poder: {
    label: '⚡ Poder',
    steps: [
      { effect: 'speedLines', delay: 0, intensity: 0.7 },
      { effect: 'lightning', delay: 0.2, intensity: 1 },
      { effect: 'shake', delay: 0.2, intensity: 0.5 },
    ],
  },
  explosao: {
    label: '🔮 Vidro estilhaçado',
    steps: [
      { effect: 'flash', delay: 0, intensity: 1 },
      { effect: 'shatter', delay: 0, intensity: 1 },
      { effect: 'shake', delay: 0, intensity: 0.8 },
    ],
  },
  dominio: {
    label: '🌌 Domínio cósmico',
    steps: [
      { effect: 'speedLines', delay: 0, intensity: 1 },
      { effect: 'lightning', delay: 0.3, intensity: 0.8 },
      { effect: 'flash', delay: 1.0, intensity: 1 },
      { effect: 'shatter', delay: 1.0, intensity: 1 },
      { effect: 'cosmos', delay: 1.0, intensity: 1 },
      { effect: 'shake', delay: 1.0, intensity: 0.7 },
    ],
  },
};

interface Instance {
  effect: FxEffect;
  start: number;
  intensity: number;
  /** Semente para o desenho variar a cada disparo. */
  seed: number;
}

export type FxSample = Record<FxEffect, { value: number; progress: number; seed: number }>;

/**
 * Linha do tempo de efeitos. O tempo é passado de fora (`now` em segundos),
 * para ficar determinística nos testes.
 */
export class FxTimeline {
  private instances: Instance[] = [];
  private seedCounter = 1;

  trigger(effect: FxEffect, now: number, intensity = 1) {
    // Redisparar o mesmo efeito reinicia (evita acumular dezenas de instâncias).
    this.instances = this.instances.filter((i) => i.effect !== effect || i.start > now);
    this.instances.push({ effect, start: now, intensity: clamp01(intensity), seed: this.seedCounter++ });
  }

  triggerPreset(preset: FxPreset, now: number, intensity = 1) {
    for (const s of FX_PRESET_DEFS[preset].steps) {
      this.instances.push({ effect: s.effect, start: now + s.delay, intensity: clamp01(s.intensity * intensity), seed: this.seedCounter++ });
    }
  }

  clear() {
    this.instances = [];
  }

  /** Quantidade de efeitos agendados ou ativos. */
  get size() {
    return this.instances.length;
  }

  sample(now: number): FxSample {
    const out = {} as FxSample;
    for (const e of FX_EFFECTS) out[e] = { value: 0, progress: 0, seed: 0 };
    this.instances = this.instances.filter((i) => now - i.start < FX_DEFS[i.effect].duration);
    for (const i of this.instances) {
      const def = FX_DEFS[i.effect];
      const p = (now - i.start) / def.duration;
      if (p < 0) continue; // agendado para depois
      const v = envelope(p, def.edge) * i.intensity;
      if (v >= out[i.effect].value) out[i.effect] = { value: v, progress: p, seed: i.seed };
    }
    return out;
  }
}
