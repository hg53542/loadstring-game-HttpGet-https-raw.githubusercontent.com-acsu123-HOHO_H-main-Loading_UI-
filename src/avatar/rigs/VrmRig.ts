import type * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { EXPRESSIONS, HUMAN_BONES, type Pose } from '@/core/animation/types';
import type { AvatarRig } from './types';

const RAD2DEG = 180 / Math.PI;

/** Nome da expressão customizada que o modelo final deve ter para a transformação demoníaca. */
export const DEMON_EXPRESSION = 'demon';

/**
 * Aplica a `Pose` a um modelo VRM (0.x ou 1.0) carregado com @pixiv/three-vrm.
 * É por aqui que o personagem FINAL vai entrar no sistema.
 *
 * Requisitos do modelo final (ver docs/AVATAR.md):
 *  - Humanoide VRM padrão, presets de expressão (blink, happy, angry, sad, surprised, relaxed, aa, ih, ou, ee, oh).
 *  - Opcional: expressão customizada "demon" (chifres/olhos/marcas via morph ou material).
 */
export class VrmRig implements AvatarRig {
  readonly kind = 'vrm' as const;
  readonly isPlaceholder: boolean;
  readonly label: string;
  private hipsBaseY: number;

  constructor(
    readonly vrm: VRM,
    opts: { label?: string; isPlaceholder?: boolean } = {},
  ) {
    this.label = opts.label ?? (vrm.meta && 'name' in vrm.meta ? String(vrm.meta.name) : 'Modelo VRM');
    this.isPlaceholder = opts.isPlaceholder ?? true;
    this.hipsBaseY = vrm.humanoid.getNormalizedBoneNode('hips')?.position.y ?? 0;
    if (vrm.lookAt) {
      vrm.lookAt.target = null; // o olhar é controlado pela Pose
      vrm.lookAt.autoUpdate = false;
    }
  }

  get root(): THREE.Object3D {
    return this.vrm.scene;
  }

  apply(pose: Pose, dt: number) {
    const h = this.vrm.humanoid;
    for (const b of HUMAN_BONES) {
      const node = h.getNormalizedBoneNode(b);
      if (!node) continue; // ossos opcionais (upperChest, ombros) podem não existir
      const r = pose.bones[b];
      node.rotation.set(r.x, r.y, r.z);
    }
    const hips = h.getNormalizedBoneNode('hips');
    if (hips) hips.position.y = this.hipsBaseY + pose.hipsOffsetY;

    const em = this.vrm.expressionManager;
    if (em) {
      for (const e of EXPRESSIONS) if (em.getExpression(e)) em.setValue(e, pose.expressions[e]);
      if (em.getExpression(DEMON_EXPRESSION)) em.setValue(DEMON_EXPRESSION, pose.demon);
    }
    if (this.vrm.lookAt) {
      this.vrm.lookAt.yaw = pose.lookAt.yaw * RAD2DEG;
      this.vrm.lookAt.pitch = pose.lookAt.pitch * RAD2DEG;
    }
    this.vrm.update(dt);
  }

  dispose() {
    this.vrm.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      mats.forEach((m) => m.dispose());
    });
  }
}
