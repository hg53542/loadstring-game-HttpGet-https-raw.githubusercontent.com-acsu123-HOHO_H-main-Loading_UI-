import type { CameraPreset, LightingPreset } from '@/core/control/commands';

type V3 = [number, number, number];

/** Enquadramentos pensados para tela vertical 9:16 (TikTok). */
export const CAMERA_DEFS: Record<Exclude<CameraPreset, 'livre'>, { position: V3; target: V3; label: string }> = {
  rosto: { position: [0, 1.66, 0.95], target: [0, 1.62, 0], label: 'Rosto' },
  busto: { position: [0, 1.56, 1.85], target: [0, 1.48, 0], label: 'Busto' },
  corpo: { position: [0, 1.15, 4.6], target: [0, 0.98, 0], label: 'Corpo inteiro' },
};

export interface LightingDef {
  label: string;
  background: string;
  ambient: { sky: string; ground: string; intensity: number };
  key: { color: string; intensity: number; position: V3 };
  fill: { color: string; intensity: number; position: V3 };
  rim: { color: string; intensity: number; position: V3 };
  floor: string;
}

export const LIGHTING_DEFS: Record<LightingPreset, LightingDef> = {
  estudio: {
    label: 'Estúdio',
    background: '#141020',
    ambient: { sky: '#cfd8ff', ground: '#2a1f30', intensity: 0.9 },
    key: { color: '#fff1dc', intensity: 2.4, position: [1.6, 3, 2.6] },
    fill: { color: '#a8c4ff', intensity: 0.9, position: [-2.2, 1.8, 1.8] },
    rim: { color: '#ffd27a', intensity: 2.2, position: [-0.8, 2.6, -2.4] },
    floor: '#1d1828',
  },
  dramatico: {
    label: 'Dramático',
    background: '#07060b',
    ambient: { sky: '#6070a0', ground: '#000000', intensity: 0.25 },
    key: { color: '#ffe0b8', intensity: 3.2, position: [2.6, 2.4, 1.2] },
    fill: { color: '#3050a0', intensity: 0.25, position: [-2.2, 1.2, 1.5] },
    rim: { color: '#7fb0ff', intensity: 3.5, position: [-1.4, 2.4, -2.2] },
    floor: '#0d0b12',
  },
  demoniaco: {
    label: 'Demoníaco',
    background: '#12030a',
    ambient: { sky: '#7a2050', ground: '#1a0005', intensity: 0.5 },
    key: { color: '#ffb0a0', intensity: 1.6, position: [1.2, 2.8, 2.4] },
    fill: { color: '#6a20ff', intensity: 0.7, position: [-2.2, 1.4, 1.6] },
    rim: { color: '#ff1030', intensity: 3.2, position: [0, 2.4, -2.4] },
    floor: '#0e0307',
  },
};
