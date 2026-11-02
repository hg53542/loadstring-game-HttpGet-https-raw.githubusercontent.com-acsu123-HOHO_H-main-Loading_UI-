import type { Emotion, GestureName } from '../animation/types';
import { EMOTIONS, GESTURES } from '../animation/types';
import type { Visemes } from '../animation/layers/talk';

/**
 * Sincronização labial para português do Brasil a partir do TEXTO.
 *
 * Funciona com qualquer motor de voz: gera uma linha do tempo de visemas
 * (formatos de boca) por caractere. Se o motor de voz informar em que caractere
 * está (evento "boundary" do navegador), a linha do tempo é realinhada.
 * Na etapa de voz, a análise do próprio áudio pode refinar isto.
 */

export type VisemeKey = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';
export type Shape = VisemeKey | 'closed' | 'rest';

export interface Segment {
  /** Índice do caractere no texto falado (para alinhar com o motor de voz). */
  char: number;
  start: number;
  end: number;
  shape: Shape;
  /** Abertura 0–1 (consoantes abrem menos que vogais). */
  open: number;
}

const strip = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Formato de boca de cada letra em pt-BR (aproximação fonética simples). */
export function shapeOf(ch: string): { shape: Shape; open: number; dur: number } {
  const c = strip(ch.toLowerCase());
  const accented = ch.toLowerCase() !== c; // á, ê, ó… são tônicas: abrem mais
  const k = accented ? 1.15 : 1;
  switch (c) {
    case 'a':
      return { shape: 'aa', open: Math.min(1, 0.85 * k), dur: 0.1 };
    case 'e':
      return { shape: 'ee', open: 0.6 * k, dur: 0.085 };
    case 'i':
    case 'y':
      return { shape: 'ih', open: 0.45, dur: 0.075 };
    case 'o':
      return { shape: 'oh', open: 0.7 * k, dur: 0.095 };
    case 'u':
    case 'w':
      return { shape: 'ou', open: 0.5, dur: 0.08 };
    case 'm':
    case 'b':
    case 'p':
      return { shape: 'closed', open: 0, dur: 0.07 };
    case 'f':
    case 'v':
      return { shape: 'ih', open: 0.15, dur: 0.065 };
    case 'l':
    case 'n':
    case 't':
    case 'd':
    case 's':
    case 'z':
    case 'c':
    case 'r':
    case 'x':
    case 'j':
    case 'g':
    case 'k':
    case 'q':
    case 'h':
      return { shape: 'ee', open: 0.22, dur: 0.055 };
    case ' ':
      return { shape: 'rest', open: 0, dur: 0.045 };
    case ',':
    case ';':
    case ':':
      return { shape: 'rest', open: 0, dur: 0.22 };
    case '.':
    case '!':
    case '?':
    case '…':
      return { shape: 'rest', open: 0, dur: 0.35 };
    default:
      return { shape: 'rest', open: 0, dur: 0.03 };
  }
}

/** Monta a linha do tempo. `rate` = velocidade da fala (1 = normal). */
export function buildTimeline(text: string, rate = 1): Segment[] {
  const out: Segment[] = [];
  let t = 0;
  const r = Math.max(0.3, Math.min(3, rate));
  [...text].forEach((ch, i) => {
    const s = shapeOf(ch);
    const dur = s.dur / r;
    out.push({ char: i, start: t, end: t + dur, shape: s.shape, open: s.open });
    t += dur;
  });
  return out;
}

export const timelineDuration = (tl: Segment[]) => (tl.length ? tl[tl.length - 1]!.end : 0);

/** Visemas no instante `t`, com mistura suave entre segmentos vizinhos. */
export function sampleTimeline(tl: Segment[], t: number): Visemes {
  const v: Required<Visemes> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  if (!tl.length || t < 0 || t > timelineDuration(tl)) return v;
  // Busca binária do segmento atual.
  let lo = 0;
  let hi = tl.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tl[mid]!.end <= t) lo = mid + 1;
    else hi = mid;
  }
  const seg = tl[lo]!;
  const next = tl[lo + 1];
  const p = (t - seg.start) / Math.max(1e-6, seg.end - seg.start);
  const add = (s: Segment | undefined, w: number) => {
    if (!s || s.shape === 'closed' || s.shape === 'rest' || w <= 0) return;
    v[s.shape] = Math.max(v[s.shape], s.open * w);
  };
  // Coarticulação: nos últimos 40% do segmento já começa o próximo formato.
  const blend = p > 0.6 ? (p - 0.6) / 0.4 : 0;
  add(seg, 1 - blend * 0.6);
  add(next, blend * 0.6);
  return v;
}

/** Tempo do caractere `charIndex` na linha do tempo (para realinhar com o motor de voz). */
export function timeOfChar(tl: Segment[], charIndex: number): number | null {
  const s = tl.find((x) => x.char >= charIndex);
  return s ? s.start : null;
}

export interface ScriptPart {
  text: string;
  emotion?: Emotion;
  gesture?: GestureName;
}

const EMOTION_TAGS: Record<string, Emotion> = {
  neutro: 'neutral',
  feliz: 'happy',
  bravo: 'angry',
  triste: 'sad',
  surpreso: 'surprised',
  relaxado: 'relaxed',
  confiante: 'confident',
  provocador: 'teasing',
  concentrado: 'focused',
  rindo: 'laughing',
};
const GESTURE_TAGS: Record<string, GestureName> = {
  acenar: 'wave',
  concordar: 'nod',
  negar: 'shake',
  rir: 'laugh',
  comemorar: 'celebrate',
  pensar: 'think',
  apontar: 'point',
  ombros: 'shrug',
};

/**
 * Lê um roteiro com marcações, ex.:
 *   "[feliz] Fala, galera! [provocador] Duvido vocês me vencerem… [rir] kkkk"
 * Também detecta risadas (kkk, haha) e transforma em emoção "rindo".
 * Etiquetas desconhecidas viram texto normal.
 */
export function parseScript(input: string): ScriptPart[] {
  const parts: ScriptPart[] = [];
  let emotion: Emotion | undefined;
  let gesture: GestureName | undefined;
  const re = /\[([a-zà-ú]+)\]/gi;
  let last = 0;
  const push = (text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    let e = emotion;
    let g = gesture;
    if (!e && /\b(k{3,}|(ha){2,}|(rs){2,})\b/i.test(clean)) {
      e = 'laughing';
      g = g ?? 'laugh';
    }
    parts.push({ text: clean, emotion: e, gesture: g });
    emotion = undefined;
    gesture = undefined;
  };
  for (const m of input.matchAll(re)) {
    const tag = m[1]!.toLowerCase();
    const isEmotion = tag in EMOTION_TAGS;
    const isGesture = tag in GESTURE_TAGS;
    if (!isEmotion && !isGesture) continue;
    push(input.slice(last, m.index));
    if (isEmotion) emotion = EMOTION_TAGS[tag];
    if (isGesture) gesture = GESTURE_TAGS[tag];
    last = m.index! + m[0].length;
  }
  push(input.slice(last));
  return parts.filter((p) => (p.emotion ? (EMOTIONS as readonly string[]).includes(p.emotion) : true) && (p.gesture ? (GESTURES as readonly string[]).includes(p.gesture) : true));
}
