import type { ControlCommand } from '../control/commands';

/**
 * Eventos da live num formato interno, independente da plataforma.
 * O módulo do TikTok (etapa 4) vai converter os eventos reais para este formato.
 * `simulated: true` marca eventos de teste — nunca devem ser tratados como reais
 * (ex.: nada de agradecer um presente que não existiu).
 */
export type LiveEvent =
  | { type: 'gift'; user: string; gift: string; coins: number; count: number; simulated: boolean }
  | { type: 'follow'; user: string; simulated: boolean }
  | { type: 'likes'; user: string; count: number; simulated: boolean }
  | { type: 'share'; user: string; simulated: boolean };

export interface ReactionConfig {
  /** Moedas totais (valor × quantidade) para cada faixa de presente. */
  giftBig: number;
  giftLegendary: number;
  /** Clipes usados em cada faixa (ids do manifesto). */
  clipGiftBig: string;
  clipGiftLegendary: string;
  /** Curtidas num único pacote para reagir. */
  likesBurst: number;
}

export const DEFAULT_REACTIONS: ReactionConfig = {
  giftBig: 100,
  giftLegendary: 1000,
  clipGiftBig: 'presente-grande',
  clipGiftLegendary: 'presente-lendario',
  likesBurst: 50,
};

export type Tier = 'pequeno' | 'grande' | 'lendario';

export function giftTier(coinsTotal: number, cfg: ReactionConfig = DEFAULT_REACTIONS): Tier {
  if (coinsTotal >= cfg.giftLegendary) return 'lendario';
  if (coinsTotal >= cfg.giftBig) return 'grande';
  return 'pequeno';
}

/**
 * Regra pura: evento → lista de comandos. Não toca em nada; quem executa é o runtime.
 * Clipes inexistentes no manifesto são ignorados pela fila, e os efeitos 3D continuam.
 */
export function reactTo(ev: LiveEvent, cfg: ReactionConfig = DEFAULT_REACTIONS): ControlCommand[] {
  switch (ev.type) {
    case 'gift': {
      const total = Math.max(0, ev.coins) * Math.max(1, ev.count);
      const tier = giftTier(total, cfg);
      if (tier === 'lendario')
        return [
          { type: 'clip', action: 'play', id: cfg.clipGiftLegendary },
          { type: 'fxPreset', preset: 'dominio' },
          { type: 'emotion', emotion: 'surprised' },
          { type: 'gesture', gesture: 'celebrate' },
        ];
      if (tier === 'grande')
        return [
          { type: 'clip', action: 'play', id: cfg.clipGiftBig },
          { type: 'fxPreset', preset: 'explosao' },
          { type: 'emotion', emotion: 'happy' },
          { type: 'gesture', gesture: 'celebrate' },
        ];
      return [
        { type: 'fxPreset', preset: 'impacto', intensity: 0.6 },
        { type: 'emotion', emotion: 'happy' },
        { type: 'gesture', gesture: 'wave' },
      ];
    }
    case 'follow':
      return [
        { type: 'fx', effect: 'speedLines', intensity: 0.6 },
        { type: 'gesture', gesture: 'point' },
      ];
    case 'likes':
      return ev.count >= cfg.likesBurst
        ? [
            { type: 'fxPreset', preset: 'poder', intensity: 0.7 },
            { type: 'gesture', gesture: 'laugh' },
          ]
        : [];
    case 'share':
      return [{ type: 'gesture', gesture: 'nod' }];
  }
}

/** Texto curto para o log do painel. */
export function describeEvent(ev: LiveEvent): string {
  const tag = ev.simulated ? '[SIMULADO] ' : '';
  switch (ev.type) {
    case 'gift':
      return `${tag}${ev.user} enviou ${ev.count}× ${ev.gift} (${ev.coins * ev.count} moedas)`;
    case 'follow':
      return `${tag}${ev.user} começou a seguir`;
    case 'likes':
      return `${tag}${ev.user} curtiu ${ev.count}×`;
    case 'share':
      return `${tag}${ev.user} compartilhou`;
  }
}
