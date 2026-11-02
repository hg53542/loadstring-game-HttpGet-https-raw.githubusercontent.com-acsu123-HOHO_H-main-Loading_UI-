import { CAMERA_PRESETS, LIGHTING_PRESETS, type CameraPreset, type LightingPreset } from '@/core/control/commands';

export interface UrlOptions {
  transparent: boolean;
  quality: 'baixa' | 'media' | 'alta';
  camera: CameraPreset | null;
  lighting: LightingPreset | null;
  vrm: string | null;
  hideBadge: boolean;
}

const QUALITIES = ['baixa', 'media', 'alta'] as const;

/** Lê opções da URL, ex.: /viewer?transparent=1&camera=busto&quality=baixa */
export function parseUrlOptions(search: string): UrlOptions {
  const p = new URLSearchParams(search);
  const flag = (k: string) => p.has(k) && p.get(k) !== '0' && p.get(k) !== 'false';
  const pick = <T extends string>(list: readonly T[], v: string | null): T | null =>
    v && (list as readonly string[]).includes(v) ? (v as T) : null;
  const vrm = p.get('vrm');
  return {
    transparent: flag('transparent'),
    quality: pick(QUALITIES, p.get('quality')) ?? 'media',
    camera: pick(CAMERA_PRESETS, p.get('camera')),
    lighting: pick(LIGHTING_PRESETS, p.get('lighting')),
    // Só caminhos locais do próprio site (evita carregar arquivos de terceiros).
    vrm: vrm && vrm.startsWith('/') && !vrm.startsWith('//') && vrm.endsWith('.vrm') ? vrm : null,
    hideBadge: flag('nobadge'),
  };
}
