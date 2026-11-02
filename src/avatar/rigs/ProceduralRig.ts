import * as THREE from 'three';
import { clamp } from '@/core/animation/math';
import { HUMAN_BONES, type Pose } from '@/core/animation/types';
import { buildLevi, LEVI_PALETTE, type LeviModel } from '../procedural/buildLevi';
import type { AvatarRig } from './types';

const C = {
  hair: new THREE.Color(LEVI_PALETTE.hair),
  hairDemon: new THREE.Color(LEVI_PALETTE.hairDemon),
  sclera: new THREE.Color(LEVI_PALETTE.eyeWhite),
  scleraDemon: new THREE.Color(LEVI_PALETTE.eyeWhiteDemon),
  iris: new THREE.Color(LEVI_PALETTE.iris),
  irisDemon: new THREE.Color(LEVI_PALETTE.irisDemon),
};

/** Aplica a `Pose` ao modelo provisório procedural. */
export class ProceduralRig implements AvatarRig {
  readonly kind = 'procedural' as const;
  readonly isPlaceholder = true;
  readonly label = 'Levi — modelo provisório (procedural)';
  readonly model: LeviModel;
  private time = 0;

  constructor() {
    this.model = buildLevi();
  }

  get root() {
    return this.model.root;
  }

  apply(pose: Pose, dt: number) {
    this.time += dt;
    const m = this.model;
    const ex = pose.expressions;

    for (const b of HUMAN_BONES) {
      const r = pose.bones[b];
      m.bones[b].rotation.set(r.x, r.y, r.z);
    }
    m.bones.hips.position.y = m.hipsBaseY + pose.hipsOffsetY;

    // Respiração visível no volume do peito.
    const bs = 1 + pose.breath * 0.025;
    for (const t of m.breathTargets) {
      t.userData.baseZ ??= t.scale.z;
      t.scale.z = (t.userData.baseZ as number) * bs;
    }
    // Capa balança levemente.
    m.cape.rotation.x = 0.05 + pose.breath * 0.02 + Math.sin(this.time * 1.3) * 0.015 + pose.hipsOffsetY * 2;

    // ---- Olhos ----
    const blinkL = Math.max(ex.blink, ex.blinkLeft);
    const blinkR = Math.max(ex.blink, ex.blinkRight);
    const open = (1 + 0.25 * ex.surprised) * (1 - 0.3 * ex.happy - 0.25 * ex.angry - 0.15 * ex.relaxed - 0.1 * ex.sad);
    for (const e of m.face.eyes) {
      const blink = e.side === 1 ? blinkL : blinkR;
      e.group.scale.y = Math.max(0.06, open * (1 - blink));
      e.iris.position.x = clamp(pose.lookAt.yaw, -0.6, 0.6) * 0.016;
      e.iris.position.y = -0.002 + clamp(pose.lookAt.pitch, -0.4, 0.4) * 0.018;
      e.iris.scale.setScalar(1 - 0.15 * ex.surprised);
    }

    // ---- Sobrancelhas ----
    for (const b of m.face.brows) {
      b.mesh.position.y = b.baseY + 0.012 * ex.surprised + 0.004 * ex.happy - 0.006 * ex.angry + 0.004 * ex.sad - 0.003 * pose.demon;
      // Lado esquerdo (x+): Z+ abaixa a ponta interna (bravo).
      const tilt = 0.45 * ex.angry - 0.4 * ex.sad + 0.25 * pose.demon;
      b.mesh.rotation.z = tilt * b.side;
    }

    // ---- Boca ----
    const openAmt = clamp(Math.max(ex.aa, ex.oh * 0.85, ex.ou * 0.55, ex.ih * 0.4, ex.ee * 0.35, ex.surprised * 0.35), 0, 1);
    const wide = 1 + 0.35 * ex.ee + 0.25 * ex.ih - 0.35 * ex.ou - 0.25 * ex.oh + 0.25 * ex.happy;
    const f = m.face;
    f.mouthOpen.visible = openAmt > 0.04;
    f.mouthOpen.scale.set(wide * (0.8 + 0.2 * openAmt), 0.15 + openAmt * 0.9, 1);
    const smileAmt = clamp(ex.happy + ex.relaxed * 0.5, 0, 1);
    const frownAmt = clamp(ex.sad + ex.angry * 0.6, 0, 1) * (1 - smileAmt);
    f.smile.visible = smileAmt > 0.05 && openAmt < 0.5;
    f.smile.scale.set(0.6 + 0.5 * smileAmt, 0.3 + 0.7 * smileAmt, 1);
    f.frown.visible = frownAmt > 0.05 && openAmt < 0.5;
    f.frown.scale.set(0.6 + 0.4 * frownAmt, 0.3 + 0.5 * frownAmt, 1);
    f.mouthLine.visible = !f.mouthOpen.visible && !f.smile.visible && !f.frown.visible;

    // ---- Forma demoníaca ----
    const d = pose.demon;
    const dm = m.demon;
    const hornScale = Math.max(0.0001, d < 0.15 ? 0 : (d - 0.15) / 0.85);
    for (const h of dm.horns) h.scale.setScalar(hornScale);
    const glow = 0.5 + 0.5 * Math.sin(this.time * 3);
    for (const mk of dm.marks) (mk.material as THREE.MeshBasicMaterial).opacity = clamp((d - 0.3) / 0.7, 0, 1);
    dm.aura.visible = d > 0.02;
    (dm.aura.material as THREE.MeshBasicMaterial).opacity = d * (0.55 + 0.25 * glow);
    dm.aura.scale.setScalar(1 + 0.04 * glow * d);
    dm.light.intensity = d * (1.2 + 0.6 * glow);
    dm.hairMat.color.lerpColors(C.hair, C.hairDemon, d);
    dm.hairMat.emissiveIntensity = d * 0.25;
    dm.scleraMat.color.lerpColors(C.sclera, C.scleraDemon, clamp((d - 0.5) * 2, 0, 1));
    dm.irisMat.color.lerpColors(C.iris, C.irisDemon, d);
    dm.trimMat.emissiveIntensity = d * (0.6 + 0.4 * glow);
  }

  dispose() {
    this.model.geometries.forEach((g) => g.dispose());
    this.model.materials.forEach((mat) => {
      const map = (mat as THREE.MeshBasicMaterial).map;
      map?.dispose();
      mat.dispose();
    });
  }
}
