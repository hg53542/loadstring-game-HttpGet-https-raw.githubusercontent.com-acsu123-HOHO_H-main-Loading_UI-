/**
 * Ferramentas de desenho estilo anime para Canvas 2D:
 * formas suaves, fitas afiladas (mechas), sombra chapada (cel) e contorno.
 */

export type V = [number, number];

export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
export const len = (a: V) => Math.hypot(a[0], a[1]);
export const lerpV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const dir = (angle: number): V => [Math.cos(angle), Math.sin(angle)];
export const perp = (a: V): V => [-a[1], a[0]];
export const norm = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
const at = (pts: V[], i: number): V => pts[Math.max(0, Math.min(pts.length - 1, i))]!;

/** Polígono fechado e arredondado (curvas passando pelos pontos médios). */
export function smoothClosed(pts: V[], tension = 1): Path2D {
  const p = new Path2D();
  const n = pts.length;
  if (n < 3) return p;
  const mid = (i: number): V => lerpV(at(pts, i % n), at(pts, (i + 1) % n), 0.5);
  const m0 = mid(n - 1);
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const c = at(pts, i);
    const m = mid(i);
    if (tension >= 1) p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
    else {
      const cc = lerpV(lerpV(at(pts, (i + n - 1) % n), m, 0.5), c, tension);
      p.quadraticCurveTo(cc[0], cc[1], m[0], m[1]);
    }
  }
  p.closePath();
  return p;
}

/** Polígono com cantos vivos (para pontas de cabelo, golas, armadura). */
export function sharpClosed(pts: V[]): Path2D {
  const p = new Path2D();
  pts.forEach((v, i) => (i ? p.lineTo(v[0], v[1]) : p.moveTo(v[0], v[1])));
  p.closePath();
  return p;
}

/** Linha suave aberta. */
export function smoothOpen(pts: V[]): Path2D {
  const p = new Path2D();
  if (pts.length < 2) return p;
  const f = at(pts, 0);
  p.moveTo(f[0], f[1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const c = at(pts, i);
    const m = lerpV(c, at(pts, i + 1), 0.5);
    p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  const l = at(pts, pts.length - 1);
  p.lineTo(l[0], l[1]);
  return p;
}

/**
 * Fita afilada ao longo de uma linha central (mecha de cabelo, aba de roupa).
 * `widths[i]` é a largura total no ponto i; ponta termina afiada.
 */
export function ribbon(center: V[], widths: number[], sharpTip = true): Path2D {
  const n = center.length;
  const left: V[] = [];
  const right: V[] = [];
  for (let i = 0; i < n; i++) {
    const a = at(center, i - 1);
    const b = at(center, i + 1);
    const t = norm(sub(b, a));
    const nrm = perp(t);
    const w = (widths[i] ?? 0) / 2;
    left.push(add(at(center, i), mul(nrm, w)));
    right.push(add(at(center, i), mul(nrm, -w)));
  }
  const p = new Path2D();
  const l0 = at(left, 0);
  p.moveTo(l0[0], l0[1]);
  for (let i = 1; i < n - 1; i++) {
    const c = at(left, i);
    const m = lerpV(c, at(left, i + 1), 0.5);
    p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  const tip = at(center, n - 1);
  if (sharpTip) p.lineTo(tip[0], tip[1]);
  else {
    const lt = at(left, n - 1);
    p.lineTo(lt[0], lt[1]);
    const rt = at(right, n - 1);
    p.lineTo(rt[0], rt[1]);
  }
  for (let i = n - 2; i >= 1; i--) {
    const c = at(right, i);
    const m = lerpV(c, at(right, i - 1), 0.5);
    p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  const r0 = at(right, 0);
  p.lineTo(r0[0], r0[1]);
  p.closePath();
  return p;
}

export interface Style {
  /** Espessura do contorno em unidades de desenho. */
  line: number;
  /** Deslocamento da luz para a sombra chapada (luz vem de cima-esquerda). */
  light: V;
}

/**
 * Preenchimento cel shading: pinta tudo com a cor de sombra e por cima a cor base
 * deslocada na direção da luz, recortada pela própria forma → sobra uma "lua" de
 * sombra no lado oposto à luz, como em anime.
 */
export function cel(ctx: CanvasRenderingContext2D, path: Path2D, base: string, shade: string, st: Style, k = 1) {
  ctx.fillStyle = shade;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.translate(-st.light[0] * k, -st.light[1] * k);
  ctx.fillStyle = base;
  ctx.fill(path);
  ctx.restore();
}

export function outline(ctx: CanvasRenderingContext2D, path: Path2D, color: string, st: Style, k = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = st.line * k;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(path);
}

/** Forma completa: sombra chapada + contorno. */
export function shape(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  colors: { base: string; shade: string; line: string },
  st: Style,
  opts: { shadeK?: number; lineK?: number } = {},
) {
  cel(ctx, path, colors.base, colors.shade, st, opts.shadeK ?? 1);
  outline(ctx, path, colors.line, st, opts.lineK ?? 1);
}

/** Mistura duas cores hex (#rrggbb). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round((((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k)) << s;
  return `#${(ch(16) | ch(8) | ch(0)).toString(16).padStart(6, '0')}`;
}
