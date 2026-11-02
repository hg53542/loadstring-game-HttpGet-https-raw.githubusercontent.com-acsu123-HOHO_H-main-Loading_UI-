'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { damp } from '@/core/animation/math';
import { useSceneStore } from '@/state/sceneStore';
import { LIGHTING_DEFS } from './presets';

const tmpColor = new THREE.Color();

function dampColor(c: THREE.Color, hex: string, k: number, dt: number) {
  tmpColor.set(hex);
  c.r = damp(c.r, tmpColor.r, k, dt);
  c.g = damp(c.g, tmpColor.g, k, dt);
  c.b = damp(c.b, tmpColor.b, k, dt);
}

/** Três pontos de luz (key/fill/rim) + ambiente, com transição suave entre presets. */
export function Lighting({ transparent, shadowMapSize = 1024, showFloor = true }: { transparent: boolean; shadowMapSize?: number; showFloor?: boolean }) {
  const preset = useSceneStore((s) => s.lighting);
  const scene = useThree((s) => s.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const floorMat = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (transparent) {
      scene.background = null;
      return;
    }
    scene.background = new THREE.Color(LIGHTING_DEFS.estudio.background);
    return () => {
      scene.background = null;
    };
  }, [scene, transparent]);

  useFrame((_, dt) => {
    const d = LIGHTING_DEFS[preset];
    const k = 3;
    if (hemi.current) {
      dampColor(hemi.current.color, d.ambient.sky, k, dt);
      dampColor(hemi.current.groundColor, d.ambient.ground, k, dt);
      hemi.current.intensity = damp(hemi.current.intensity, d.ambient.intensity, k, dt);
    }
    for (const [ref, def] of [
      [key, d.key],
      [fill, d.fill],
      [rim, d.rim],
    ] as const) {
      const l = ref.current;
      if (!l) continue;
      dampColor(l.color, def.color, k, dt);
      l.intensity = damp(l.intensity, def.intensity, k, dt);
      l.position.set(
        damp(l.position.x, def.position[0], k, dt),
        damp(l.position.y, def.position[1], k, dt),
        damp(l.position.z, def.position[2], k, dt),
      );
    }
    if (!transparent && scene.background instanceof THREE.Color) dampColor(scene.background, d.background, k, dt);
    if (floorMat.current) dampColor(floorMat.current.color, d.floor, k, dt);
  });

  const s = LIGHTING_DEFS.estudio;
  return (
    <>
      <hemisphereLight ref={hemi} args={[s.ambient.sky, s.ambient.ground, s.ambient.intensity]} />
      <directionalLight
        ref={key}
        position={s.key.position}
        intensity={s.key.intensity}
        color={s.key.color}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={2.2}
        shadow-camera-bottom={-0.3}
        shadow-camera-near={0.5}
        shadow-camera-far={8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={fill} position={s.fill.position} intensity={s.fill.intensity} color={s.fill.color} />
      <directionalLight ref={rim} position={s.rim.position} intensity={s.rim.intensity} color={s.rim.color} />
      {!transparent && showFloor && (
        <group>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[1.4, 64]} />
            <meshStandardMaterial ref={floorMat} color={s.floor} roughness={0.55} metalness={0.3} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
            <ringGeometry args={[1.36, 1.4, 64]} />
            <meshBasicMaterial color="#d4a640" />
          </mesh>
        </group>
      )}
    </>
  );
}
