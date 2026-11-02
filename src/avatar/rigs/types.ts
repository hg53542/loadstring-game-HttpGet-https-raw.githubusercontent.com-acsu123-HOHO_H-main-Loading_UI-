import type * as THREE from 'three';
import type { Pose } from '@/core/animation/types';

/**
 * Um "rig" sabe aplicar uma `Pose` genérica a um modelo 3D específico.
 * Trocar o modelo provisório pelo VRM final = trocar o rig; o resto do sistema não muda.
 */
export interface AvatarRig {
  readonly kind: 'procedural' | 'vrm';
  /** true = modelo provisório, não é o personagem final. Exibido na interface. */
  readonly isPlaceholder: boolean;
  readonly label: string;
  readonly root: THREE.Object3D;
  apply(pose: Pose, dt: number): void;
  dispose(): void;
}
