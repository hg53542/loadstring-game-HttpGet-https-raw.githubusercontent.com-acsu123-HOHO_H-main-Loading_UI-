'use client';

import { useEffect, useRef } from 'react';
import type { FxTimeline } from '@/core/fx/effects';
import { drawFx2d, has2dFx } from './draw2d';

/** Canvas 2D por cima da cena 3D com os efeitos de anime. Não captura cliques. */
export function FxOverlay({ fx, scale = 1 }: { fx: FxTimeline; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let frame = 0;
    let dirty = false;
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = performance.now() / 1000;
      const s = fx.sample(t);
      if (has2dFx(s)) {
        drawFx2d(ctx, canvas.width, canvas.height, s, t, frame++);
        dirty = true;
      } else if (dirty) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dirty = false;
      }
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [fx, scale]);

  return (
    <canvas
      ref={ref}
      data-testid="fx-overlay"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
    />
  );
}
