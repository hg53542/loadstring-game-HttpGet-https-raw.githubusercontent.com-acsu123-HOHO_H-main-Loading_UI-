import { create } from 'zustand';
import type { CameraPreset, LightingPreset } from '@/core/control/commands';

export interface RigInfo {
  kind: 'procedural' | 'vrm';
  label: string;
  isPlaceholder: boolean;
}

interface SceneState {
  camera: CameraPreset;
  lighting: LightingPreset;
  rig: RigInfo | null;
  fps: number;
  error: string | null;
  setCamera: (c: CameraPreset) => void;
  setLighting: (l: LightingPreset) => void;
  setRig: (r: RigInfo | null) => void;
  setFps: (f: number) => void;
  setError: (e: string | null) => void;
}

/** Estado de apresentação da cena (não de animação — esse fica no AnimationController). */
export const useSceneStore = create<SceneState>((set) => ({
  camera: 'busto',
  lighting: 'estudio',
  rig: null,
  fps: 0,
  error: null,
  setCamera: (camera) => set({ camera }),
  setLighting: (lighting) => set({ lighting }),
  setRig: (rig) => set({ rig }),
  setFps: (fps) => set({ fps }),
  setError: (error) => set({ error }),
}));
