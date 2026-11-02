'use client';

import { useEffect, useRef } from 'react';
import type { AnimationController } from '@/core/animation/AnimationController';
import { damp } from '@/core/animation/math';
import type { CameraPreset, LightingPreset } from '@/core/control/commands';
import type { FxTimeline } from '@/core/fx/effects';
import { poseToLive2D } from '@/core/params/live2dParams';
import { useSceneStore } from '@/state/sceneStore';
import { Levi25D } from './levi25d';

/** Enquadramentos no espaço de desenho (centro e altura visível). */
const FRAMING: Record<Exclude<CameraPreset, 'livre'>, { cx: number; cy: number; h: number }> = {
  rosto: { cx: 500, cy: 470, h: 700 },
  busto: { cx: 500, cy: 800, h: 1350 },
  corpo: { cx: 500, cy: 1240, h: 2750 },
};

/** Tom aplicado só sobre o personagem para combinar com a iluminação da cena. */
const TINT: Record<LightingPreset, string | null> = {
  estudio: null,
  dramatico: 'rgba(30,40,110,0.28)',
  demoniaco: 'rgba(140,0,40,0.22)',
};

/**
 * Desenha o Levi 2.5D num canvas transparente por cima do fundo 3D.
 * Também é quem avança o AnimationController neste modo.
 */
export function PuppetLayer({ controller, fx, resolution = 1 }: { controller: AnimationController; fx: FxTimeline; resolution?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const setFps = useSceneStore((s) => s.setFps);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const levi = new Levi25D();
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let acc = 0;
    let view = { ...FRAMING.busto };
    let drawMs = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * resolution;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      frames++;
      acc += dt;
      if (acc >= 0.5) {
        setFps(Math.round(frames / acc));
        frames = 0;
        acc = 0;
      }
      const { camera, lighting } = useSceneStore.getState();
      const target = FRAMING[camera === 'livre' ? 'busto' : camera];
      view = { cx: damp(view.cx, target.cx, 4, dt), cy: damp(view.cy, target.cy, 4, dt), h: damp(view.h, target.h, 4, dt) };

      const pose = controller.update(dt);
      const params = poseToLive2D(pose);
      const g = controller.gestures.active?.name;
      const hand = {
        left: g === 'celebrate' || g === 'shrug' ? ('open' as const) : ('relaxed' as const),
        right: g === 'point' ? ('point' as const) : g === 'wave' || g === 'celebrate' || g === 'shrug' ? ('open' as const) : ('relaxed' as const),
      };

      const W = canvas.width;
      const H = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const scale = H / view.h;
      // tremor de câmera dos efeitos
      const shake = fx.sample(now / 1000).shake.value;
      const sx = shake > 0.01 ? (Math.random() - 0.5) * 18 * shake : 0;
      const sy = shake > 0.01 ? (Math.random() - 0.5) * 18 * shake : 0;
      ctx.setTransform(scale, 0, 0, scale, W / 2 - view.cx * scale + sx, H / 2 - view.cy * scale + sy);
      // Contorno mais fino em zoom (para não ficar grosseiro no close).
      const line = 5 / Math.pow(scale, 0.35);
      const t0 = performance.now();
      levi.draw(ctx, { pose, params, dt, time: now / 1000, hand }, { line, light: [-7, -10] });
      // Média móvel do custo de desenho (diagnóstico de desempenho, lido pelo teste e pelo painel).
      drawMs = drawMs * 0.95 + (performance.now() - t0) * 0.05;
      (window as unknown as { __leviDrawMs?: number }).__leviDrawMs = drawMs;

      const tint = TINT[lighting];
      if (tint) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [controller, fx, resolution, setFps]);

  return (
    <canvas
      ref={ref}
      data-testid="levi-25d"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
