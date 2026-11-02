'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import { damp } from '@/core/animation/math';
import type { FxTimeline } from '@/core/fx/effects';
import { useSceneStore } from '@/state/sceneStore';
import { CAMERA_DEFS } from './presets';

const tmpPos = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

/** Transição suave entre enquadramentos; em 'livre' o usuário orbita com o mouse. */
export function CameraRig({ fx }: { fx?: FxTimeline }) {
  const preset = useSceneStore((s) => s.camera);
  const camera = useThree((s) => s.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const target = useRef(new THREE.Vector3(...CAMERA_DEFS.busto.target));

  useFrame((_, dt) => {
    if (preset === 'livre') return;
    const def = CAMERA_DEFS[preset];
    tmpPos.set(...def.position);
    tmpTarget.set(...def.target);
    const k = 4;
    camera.position.set(
      damp(camera.position.x, tmpPos.x, k, dt),
      damp(camera.position.y, tmpPos.y, k, dt),
      damp(camera.position.z, tmpPos.z, k, dt),
    );
    target.current.set(
      damp(target.current.x, tmpTarget.x, k, dt),
      damp(target.current.y, tmpTarget.y, k, dt),
      damp(target.current.z, tmpTarget.z, k, dt),
    );
    camera.lookAt(target.current);
    if (controls.current) controls.current.target.copy(target.current);
    // Tremor de câmera (efeito "shake"): deslocamento aleatório que o damping desfaz sozinho.
    const shake = fx?.sample(performance.now() / 1000).shake.value ?? 0;
    if (shake > 0.01) {
      const d = camera.position.distanceTo(target.current);
      const a = 0.012 * d * shake;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enabled={preset === 'livre'}
      enablePan={false}
      minDistance={0.6}
      maxDistance={7}
      maxPolarAngle={Math.PI * 0.55}
      target={target.current}
    />
  );
}
