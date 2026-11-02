import { FX_PRESETS, type FxPreset } from '../fx/effects';

/**
 * Clipes cinematográficos pré-gerados (ex.: vídeos feitos com IA de vídeo a partir
 * da imagem oficial do Levi). Eles entram por cima do avatar 3D e depois a live
 * volta ao 3D em tempo real.
 */

export interface ClipDef {
  id: string;
  title: string;
  /** Caminho local do site, ex.: /clips/levi-entrada.mp4 */
  src: string;
  /** 'alta' fura a fila (ex.: presentes grandes). */
  priority: 'normal' | 'alta';
  /** Tempo mínimo (s) entre duas exibições do mesmo clipe. */
  cooldown: number;
  /** Clipe de teste/provisório, não é conteúdo final do Levi. */
  isPlaceholder: boolean;
  /** Efeito que acompanha a entrada do clipe (opcional). */
  introFx?: FxPreset;
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SRC_RE = /^\/clips\/[\w\-./]+\.(mp4|webm)$/i;

/** Valida o manifesto public/clips/clips.json. Itens inválidos são descartados com motivo. */
export function parseClipManifest(raw: unknown): { clips: ClipDef[]; errors: string[] } {
  const errors: string[] = [];
  const clips: ClipDef[] = [];
  const list = typeof raw === 'object' && raw !== null && Array.isArray((raw as { clips?: unknown }).clips)
    ? (raw as { clips: unknown[] }).clips
    : null;
  if (!list) return { clips, errors: ['Manifesto sem lista "clips".'] };
  const seen = new Set<string>();
  list.forEach((item, idx) => {
    const c = item as Record<string, unknown>;
    const where = `clips[${idx}]`;
    if (typeof c !== 'object' || c === null) return void errors.push(`${where}: não é um objeto`);
    if (typeof c.id !== 'string' || !ID_RE.test(c.id)) return void errors.push(`${where}: id inválido (use a-z, 0-9 e -)`);
    if (seen.has(c.id)) return void errors.push(`${where}: id "${c.id}" repetido`);
    if (typeof c.src !== 'string' || !SRC_RE.test(c.src) || c.src.includes('..'))
      return void errors.push(`${where}: src deve ser /clips/arquivo.mp4 ou .webm`);
    seen.add(c.id);
    clips.push({
      id: c.id,
      title: typeof c.title === 'string' && c.title.trim() ? c.title.trim().slice(0, 80) : c.id,
      src: c.src,
      priority: c.priority === 'alta' ? 'alta' : 'normal',
      cooldown: typeof c.cooldown === 'number' && Number.isFinite(c.cooldown) ? Math.max(0, Math.min(3600, c.cooldown)) : 30,
      isPlaceholder: c.isPlaceholder !== false,
      introFx: (FX_PRESETS as readonly unknown[]).includes(c.introFx) ? (c.introFx as FxPreset) : undefined,
    });
  });
  return { clips, errors };
}

export interface QueueItem {
  clip: ClipDef;
  /** Quem pediu: 'painel', 'regra:presente-grande'… (para o log). */
  source: string;
  queuedAt: number;
}

export type EnqueueResult = 'tocando' | 'na-fila' | 'desconhecido' | 'em-cooldown' | 'fila-cheia' | 'duplicado';

/**
 * Fila de clipes. Um clipe por vez; 'alta' entra na frente dos 'normal'.
 * Tempo vem de fora (segundos) para os testes serem determinísticos.
 */
export class ClipQueue {
  current: QueueItem | null = null;
  readonly pending: QueueItem[] = [];
  private lastPlayed = new Map<string, number>();
  private clips = new Map<string, ClipDef>();

  constructor(
    clips: ClipDef[] = [],
    readonly maxPending = 5,
  ) {
    this.setClips(clips);
  }

  setClips(clips: ClipDef[]) {
    this.clips = new Map(clips.map((c) => [c.id, c]));
  }

  get library(): ClipDef[] {
    return [...this.clips.values()];
  }

  /** Segundos que faltam para o clipe sair do cooldown (0 = liberado). */
  cooldownLeft(id: string, now: number) {
    const clip = this.clips.get(id);
    const last = this.lastPlayed.get(id);
    if (!clip || last === undefined) return 0;
    return Math.max(0, clip.cooldown - (now - last));
  }

  enqueue(id: string, now: number, source = 'painel', opts: { ignoreCooldown?: boolean } = {}): EnqueueResult {
    const clip = this.clips.get(id);
    if (!clip) return 'desconhecido';
    if (this.current?.clip.id === id || this.pending.some((p) => p.clip.id === id)) return 'duplicado';
    if (!opts.ignoreCooldown && this.cooldownLeft(id, now) > 0) return 'em-cooldown';
    const item: QueueItem = { clip, source, queuedAt: now };
    if (!this.current) {
      this.start(item, now);
      return 'tocando';
    }
    if (this.pending.length >= this.maxPending) return 'fila-cheia';
    if (clip.priority === 'alta') {
      const firstNormal = this.pending.findIndex((p) => p.clip.priority !== 'alta');
      this.pending.splice(firstNormal === -1 ? this.pending.length : firstNormal, 0, item);
    } else {
      this.pending.push(item);
    }
    return 'na-fila';
  }

  private start(item: QueueItem, now: number) {
    this.current = item;
    this.lastPlayed.set(item.clip.id, now);
  }

  /** Chamado quando o vídeo termina (ou falha). Retorna o próximo, se houver. */
  finish(now: number): QueueItem | null {
    this.current = null;
    const next = this.pending.shift();
    if (next) this.start(next, now);
    return this.current;
  }

  /** Pula o atual. */
  skip(now: number) {
    return this.finish(now);
  }

  clear() {
    this.pending.length = 0;
    this.current = null;
  }
}
