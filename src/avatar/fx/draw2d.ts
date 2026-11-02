import { createRng } from '@/core/animation/math';
import { FX_DEFS, type FxSample } from '@/core/fx/effects';

/**
 * Desenho 2D dos efeitos de anime numa camada por cima do 3D.
 * Mais barato que fazer em 3D e fica nítido em qualquer resolução.
 */

/** Linhas de foco/velocidade: convergem para o centro (o Levi). */
function speedLines(ctx: CanvasRenderingContext2D, w: number, h: number, v: number, frame: number) {
  // Re-sorteia a cada 2 quadros: dá o "tremido" típico de mangá.
  const rng = createRng(Math.floor(frame / 2) + 7);
  const cx = w / 2;
  const cy = h * 0.42;
  const outer = Math.hypot(w, h);
  const minDim = Math.min(w, h);
  ctx.fillStyle = `rgba(255,255,255,${0.85 * v})`;
  const n = 80;
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const inner = minDim * (0.32 + rng() * 0.28);
    const width = (0.004 + rng() * 0.012) * minDim * (0.5 + v);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx + ca * outer - sa * width, cy + sa * outer + ca * width);
    ctx.lineTo(cx + ca * outer + sa * width, cy + sa * outer - ca * width);
    ctx.lineTo(cx + ca * inner, cy + sa * inner);
    ctx.closePath();
    ctx.fill();
  }
}

/** Raios elétricos azuis em volta do personagem. */
function lightning(ctx: CanvasRenderingContext2D, w: number, h: number, v: number, seed: number, time: number) {
  // Novo formato a cada ~70 ms.
  const rng = createRng(seed * 1000 + Math.floor(time / 0.07));
  const bolts = 3 + Math.floor(rng() * 3);
  const flicker = 0.6 + rng() * 0.4;
  for (let b = 0; b < bolts; b++) {
    // Começa numa borda e vai na direção da silhueta.
    const side = rng() < 0.5 ? -1 : 1;
    let x = w / 2 + side * w * (0.18 + rng() * 0.32);
    let y = h * (0.05 + rng() * 0.5);
    const tx = w / 2 + side * w * (0.05 + rng() * 0.12);
    const ty = h * (0.35 + rng() * 0.45);
    const pts: [number, number][] = [[x, y]];
    const segs = 9;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      x = x + (tx - x) / (segs - i + 1) + (rng() - 0.5) * w * 0.07;
      y = y + (ty - y) / (segs - i + 1) + (rng() - 0.5) * h * 0.02;
      pts.push([x, y]);
      void t;
    }
    const path = () => {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    };
    ctx.save();
    ctx.globalAlpha = v * flicker;
    ctx.shadowColor = '#4fd8ff';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = '#7fe8ff';
    ctx.lineWidth = Math.max(2, w * 0.008);
    ctx.lineJoin = 'round';
    path();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, w * 0.0025);
    path();
    ctx.stroke();
    ctx.restore();
  }
}

/** Vidro estilhaçando: cacos saem do centro girando. */
function shatter(ctx: CanvasRenderingContext2D, w: number, h: number, v: number, seed: number, progress: number) {
  const rng = createRng(seed * 7919);
  const t = progress * FX_DEFS.shatter.duration;
  const cx = w / 2;
  const cy = h * 0.45;
  const minDim = Math.min(w, h);
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2;
    const speed = minDim * (0.25 + rng() * 0.9);
    const size = minDim * (0.02 + rng() * 0.07);
    const spin = (rng() - 0.5) * 8;
    const start = minDim * rng() * 0.15;
    const dist = start + speed * t + 0.5 * minDim * 0.4 * t * t;
    const x = cx + Math.cos(a) * dist;
    const y = cy + Math.sin(a) * dist * 1.3;
    const r = rng() * Math.PI * 2 + spin * t;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    ctx.globalAlpha = v;
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(size * (0.4 + rng() * 0.3), -size * 0.5);
    ctx.lineTo(size * (rng() * 0.4 - 0.1), size * 0.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(190,225,255,0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1, minDim * 0.002);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawFx2d(ctx: CanvasRenderingContext2D, w: number, h: number, s: FxSample, time: number, frame: number) {
  ctx.clearRect(0, 0, w, h);
  if (s.speedLines.value > 0.01) speedLines(ctx, w, h, s.speedLines.value, frame);
  if (s.lightning.value > 0.01) lightning(ctx, w, h, s.lightning.value, s.lightning.seed, time);
  if (s.shatter.value > 0.01) shatter(ctx, w, h, s.shatter.value, s.shatter.seed, s.shatter.progress);
  if (s.flash.value > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${0.9 * s.flash.value})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/** true se algum efeito 2D está visível (evita redesenhar à toa). */
export const has2dFx = (s: FxSample) =>
  s.speedLines.value > 0.01 || s.lightning.value > 0.01 || s.shatter.value > 0.01 || s.flash.value > 0.01;
