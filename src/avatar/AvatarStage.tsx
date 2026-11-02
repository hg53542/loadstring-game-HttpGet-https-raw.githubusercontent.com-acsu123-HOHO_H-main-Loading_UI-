'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { AnimationController } from '@/core/animation/AnimationController';
import { useSceneStore } from '@/state/sceneStore';
import { LeviAvatar } from './LeviAvatar';
import { CameraRig } from './scene/CameraRig';
import { Lighting } from './scene/Lighting';
import { CAMERA_DEFS } from './scene/presets';

export interface StageOptions {
  transparent?: boolean;
  /** Qualidade "baixa" reduz resolução e sombras — para notebooks com GPU integrada. */
  quality?: 'baixa' | 'media' | 'alta';
  vrmUrl?: string | null;
  vrmIsFinal?: boolean;
}

const QUALITY = {
  baixa: { dpr: [0.75, 1] as [number, number], shadow: 512, antialias: false },
  media: { dpr: [1, 1.25] as [number, number], shadow: 1024, antialias: true },
  alta: { dpr: [1, 2] as [number, number], shadow: 2048, antialias: true },
};

function FpsMeter() {
  const setFps = useSceneStore((s) => s.setFps);
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.frames++;
    a.time += dt;
    if (a.time >= 0.5) {
      setFps(Math.round(a.frames / a.time));
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}

/** Canvas 3D com câmera, luzes e o Levi. Usado tanto pelo /viewer quanto pelo /admin. */
export function AvatarStage({
  controller,
  transparent = false,
  quality = 'media',
  vrmUrl = null,
  vrmIsFinal = false,
}: StageOptions & { controller: AnimationController }) {
  const q = QUALITY[quality];
  const cam = CAMERA_DEFS.busto;
  return (
    <Canvas
      shadows
      dpr={q.dpr}
      gl={{ antialias: q.antialias, alpha: transparent, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 30, near: 0.05, far: 50, position: cam.position }}
      style={{ background: 'transparent' }}
      data-testid="levi-canvas"
    >
      <Lighting transparent={transparent} shadowMapSize={q.shadow} />
      <CameraRig />
      <LeviAvatar controller={controller} vrmUrl={vrmUrl} vrmIsFinal={vrmIsFinal} />
      <FpsMeter />
    </Canvas>
  );
}
