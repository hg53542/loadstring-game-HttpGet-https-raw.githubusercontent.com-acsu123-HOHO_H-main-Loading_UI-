'use client';

import { useEffect, useRef } from 'react';
import type { AnimationController } from '@/core/animation/AnimationController';
import { damp } from '@/core/animation/math';
import type { CameraPreset, LightingPreset } from '@/core/control/commands';
import type { FxTimeline } from '@/core/fx/effects';
import { poseToLive2D } from '@/core/params/live2dParams';
import { useSceneStore } from '@/state/sceneStore';
import { drawDesk, drawGamingChair, drawRoomGlow, renderRoomBackdrop } from './gamerRoom';
import { Levi25D } from './levi25d';

/** Enquadramentos no espaço de desenho (centro e altura visível). */
const FRAMING: Record<Exclude<CameraPreset, 'livre'>, { cx: number; cy: number; h: number }> = {
  rosto: { cx: 500, cy: 470, h: 700 },
  busto: { cx: 500, cy: 800, h: 1350 },
  corpo: { cx: 500, cy: 1240, h: 2750 },
};

/** No quarto ele está sentado à mesa: o "corpo inteiro" vira um plano aberto da mesa. */
const ROOM_FRAMING: typeof FRAMING = { ...FRAMING, corpo: { cx: 500, cy: 980, h: 1900 } };

/** Palco: cor do holofote, da luz de contorno e da sombra no chão por iluminação. */
const STAGE: Record<LightingPreset, { spot: string; rim: string; floor: string }> = {
  estudio: { spot: '255,214,150', rim: 'rgba(255,236,190,0.95)', floor: '212,166,64' },
  dramatico: { spot: '120,160,255', rim: 'rgba(160,200,255,0.95)', floor: '90,120,220' },
  demoniaco: { spot: '255,40,80', rim: 'rgba(255,70,100,0.95)', floor: '200,20,60' },
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
export function PuppetLayer({
  controller,
  fx,
  resolution = 1,
  transparent = false,
}: {
  controller: AnimationController;
  fx: FxTimeline;
  resolution?: number;
  /** Modo OBS: sem holofote/chão, só o personagem. */
  transparent?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const setFps = useSceneStore((s) => s.setFps);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const levi = new Levi25D();
    // Camadas fora da tela: personagem e luz de contorno (para efeitos só sobre ele).
    const charCanvas = document.createElement('canvas');
    const rimCanvas = document.createElement('canvas');
    const cctx = charCanvas.getContext('2d')!;
    const rctx = rimCanvas.getContext('2d')!;
    let backdrop: HTMLCanvasElement | null = null;
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
      charCanvas.width = rimCanvas.width = canvas.width;
      charCanvas.height = rimCanvas.height = canvas.height;
      backdrop = null; // refaz o fundo do quarto no novo tamanho
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
      const { camera, lighting, scene, outfit } = useSceneStore.getState();
      const room = scene === 'quarto';
      const target = (room ? ROOM_FRAMING : FRAMING)[camera === 'livre' ? 'busto' : camera];
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
      const scale = H / view.h;
      // tremor de câmera dos efeitos
      const shake = fx.sample(now / 1000).shake.value;
      const sx = shake > 0.01 ? (Math.random() - 0.5) * 18 * shake : 0;
      const sy = shake > 0.01 ? (Math.random() - 0.5) * 18 * shake : 0;
      const tx = W / 2 - view.cx * scale + sx;
      const ty = H / 2 - view.cy * scale + sy;
      const stage = STAGE[lighting];
      const t0 = performance.now();

      // 1) Personagem na camada própria
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.globalCompositeOperation = 'source-over';
      cctx.clearRect(0, 0, W, H);
      cctx.setTransform(scale, 0, 0, scale, tx, ty);
      // Contorno mais fino em zoom (para não ficar grosseiro no close).
      const line = 5 / Math.pow(scale, 0.35);
      const st = { line, light: [-7, -10] as [number, number] };
      if (room && !transparent) drawGamingChair(cctx, st, now / 1000);
      levi.draw(cctx, { pose, params, dt, time: now / 1000, hand, outfit }, st);

      // 2) Volume: luz suave de cima-esquerda e sombra embaixo, só sobre o personagem
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.globalCompositeOperation = 'source-atop';
      const vol = cctx.createLinearGradient(0, 0, W * 0.6, H);
      vol.addColorStop(0, 'rgba(255,250,235,0.10)');
      vol.addColorStop(0.5, 'rgba(255,250,235,0)');
      vol.addColorStop(1, 'rgba(20,0,40,0.16)');
      cctx.fillStyle = vol;
      cctx.fillRect(0, 0, W, H);
      const tint = TINT[lighting];
      if (tint) {
        cctx.fillStyle = tint;
        cctx.fillRect(0, 0, W, H);
      }

      // 3) Luz de contorno: silhueta pintada da cor da luz, menos ela mesma deslocada
      const off = Math.max(2, 3.2 * scale * 0.9);
      rctx.globalCompositeOperation = 'source-over';
      rctx.clearRect(0, 0, W, H);
      rctx.drawImage(charCanvas, 0, 0);
      rctx.globalCompositeOperation = 'source-in';
      rctx.fillStyle = room ? 'rgba(200,150,255,0.95)' : stage.rim;
      rctx.fillRect(0, 0, W, H);
      rctx.globalCompositeOperation = 'destination-out';
      rctx.drawImage(charCanvas, off, off * 0.6);
      cctx.globalCompositeOperation = 'source-atop';
      cctx.globalAlpha = 0.55;
      cctx.drawImage(rimCanvas, 0, 0);
      cctx.globalAlpha = 1;
      cctx.globalCompositeOperation = 'source-over';

      // 4) Palco (holofote + sombra no chão) e composição final
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!transparent && room) {
        backdrop ??= renderRoomBackdrop(W, H);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(backdrop, 0, 0, W, H);
        drawRoomGlow(ctx, W, H, now / 1000);
      } else if (!transparent) {
        ctx.setTransform(scale, 0, 0, scale, tx, ty);
        ctx.globalCompositeOperation = 'lighter';
        const spot = ctx.createRadialGradient(500, 900, 60, 500, 900, 1100);
        spot.addColorStop(0, `rgba(${stage.spot},0.22)`);
        spot.addColorStop(0.6, `rgba(${stage.spot},0.06)`);
        spot.addColorStop(1, `rgba(${stage.spot},0)`);
        ctx.fillStyle = spot;
        ctx.fillRect(-700, -300, 2400, 2700);
        const floorGlow = ctx.createRadialGradient(500, 2490, 20, 500, 2490, 520);
        floorGlow.addColorStop(0, `rgba(${stage.floor},0.35)`);
        floorGlow.addColorStop(1, `rgba(${stage.floor},0)`);
        ctx.fillStyle = floorGlow;
        ctx.beginPath();
        ctx.ellipse(500, 2490, 520, 90, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // sombra de contato sob os pés (acompanha pulos: menor e mais clara no ar)
        const air = Math.min(1, Math.max(0, pose.hipsOffsetY * 8));
        ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - air * 0.6)})`;
        ctx.beginPath();
        ctx.ellipse(500, 2496, 230 * (1 - air * 0.3), 34 * (1 - air * 0.3), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.drawImage(charCanvas, 0, 0);
      if (!transparent && room) {
        // Mesa na frente (acompanha o enquadramento do personagem)
        ctx.setTransform(scale, 0, 0, scale, tx, ty);
        drawDesk(ctx, st, now / 1000, controller.talk.level);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      // Média móvel do custo de desenho (diagnóstico de desempenho, lido pelo teste e pelo painel).
      drawMs = drawMs * 0.95 + (performance.now() - t0) * 0.05;
      (window as unknown as { __leviDrawMs?: number }).__leviDrawMs = drawMs;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [controller, fx, resolution, transparent, setFps]);

  return (
    <canvas
      ref={ref}
      data-testid="levi-25d"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
