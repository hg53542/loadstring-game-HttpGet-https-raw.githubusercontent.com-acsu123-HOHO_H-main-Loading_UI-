'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createRng } from '@/core/animation/math';
import type { FxTimeline } from '@/core/fx/effects';

/** Textura de nebulosa gerada em canvas (sem arquivos externos). */
function makeNebula(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#05020f';
  ctx.fillRect(0, 0, c.width, c.height);
  const rng = createRng(2024);
  const colors = ['rgba(140,60,255,', 'rgba(40,120,255,', 'rgba(255,60,180,', 'rgba(80,220,255,'];
  ctx.globalCompositeOperation = 'lighter';
  // Poucas manchas, pouco opacas: somadas ('lighter') elas estouram para o branco se exagerar.
  for (let i = 0; i < 14; i++) {
    const x = rng() * c.width;
    const y = c.height * (0.25 + rng() * 0.5);
    const r = 50 + rng() * 140;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = colors[i % colors.length]!;
    g.addColorStop(0, `${col}0.16)`);
    g.addColorStop(1, `${col}0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  // Escurece os polos da esfera (vinheta vertical).
  const vg = ctx.createLinearGradient(0, 0, 0, c.height);
  vg.addColorStop(0, 'rgba(2,0,8,0.9)');
  vg.addColorStop(0.3, 'rgba(2,0,8,0)');
  vg.addColorStop(0.7, 'rgba(2,0,8,0)');
  vg.addColorStop(1, 'rgba(2,0,8,0.9)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 900; i++) {
    const a = 0.3 + rng() * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    const s = rng() < 0.05 ? 2 : 1;
    ctx.fillRect(rng() * c.width, rng() * c.height, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Fundo cósmico 3D (esfera + estrelas) que aparece com o efeito "cosmos". */
export function CosmicBackdrop({ fx }: { fx: FxTimeline }) {
  const group = useRef<THREE.Group>(null);
  const skyMat = useRef<THREE.MeshBasicMaterial>(null);
  const starMat = useRef<THREE.PointsMaterial>(null);
  const texture = useMemo(() => makeNebula(), []);
  const stars = useMemo(() => {
    const rng = createRng(77);
    const n = 1200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 4 + rng() * 10;
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) + 1.2, r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(
    () => () => {
      texture.dispose();
      stars.dispose();
    },
    [texture, stars],
  );

  useFrame((_, dt) => {
    const v = fx.sample(performance.now() / 1000).cosmos.value;
    if (!group.current) return;
    group.current.visible = v > 0.01;
    if (!group.current.visible) return;
    group.current.rotation.y += dt * 0.08;
    if (skyMat.current) skyMat.current.opacity = v;
    if (starMat.current) starMat.current.opacity = v;
  });

  return (
    <group ref={group} visible={false}>
      <mesh renderOrder={-10}>
        <sphereGeometry args={[18, 32, 16]} />
        <meshBasicMaterial ref={skyMat} map={texture} side={THREE.BackSide} transparent opacity={0} depthWrite={false} fog={false} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial ref={starMat} size={0.05} color="#ffffff" transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  );
}
