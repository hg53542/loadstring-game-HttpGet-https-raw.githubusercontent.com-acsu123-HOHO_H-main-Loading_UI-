import type { AnimationController } from '../animation/AnimationController';
import {
  EMOTIONS,
  GESTURES,
  LOOK_MODES,
  type AnimationSettings,
  type Emotion,
  type GestureName,
} from '../animation/types';

export const CAMERA_PRESETS = ['rosto', 'busto', 'corpo', 'livre'] as const;
export type CameraPreset = (typeof CAMERA_PRESETS)[number];

export const LIGHTING_PRESETS = ['estudio', 'dramatico', 'demoniaco'] as const;
export type LightingPreset = (typeof LIGHTING_PRESETS)[number];

/**
 * Protocolo de comandos do avatar. Todo controle (painel, IA, TikTok, atalhos)
 * deve passar por aqui — é o contrato entre os módulos e o avatar.
 */
export type ControlCommand =
  | { type: 'emotion'; emotion: Emotion; intensity?: number }
  | { type: 'gesture'; gesture: GestureName }
  | { type: 'blink' }
  | { type: 'demon'; value: number }
  | { type: 'settings'; patch: Partial<AnimationSettings> }
  | { type: 'camera'; preset: CameraPreset }
  | { type: 'lighting'; preset: LightingPreset };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

/** Valida dados vindos de fora (outra aba, rede, IA). Retorna null se inválido. */
export function parseCommand(raw: unknown): ControlCommand | null {
  if (!isObj(raw)) return null;
  switch (raw.type) {
    case 'emotion':
      if (!oneOf(EMOTIONS, raw.emotion)) return null;
      if (raw.intensity !== undefined && !isNum(raw.intensity)) return null;
      return { type: 'emotion', emotion: raw.emotion, intensity: raw.intensity as number | undefined };
    case 'gesture':
      return oneOf(GESTURES, raw.gesture) ? { type: 'gesture', gesture: raw.gesture } : null;
    case 'blink':
      return { type: 'blink' };
    case 'demon':
      return isNum(raw.value) ? { type: 'demon', value: raw.value } : null;
    case 'settings': {
      if (!isObj(raw.patch)) return null;
      const p = raw.patch;
      const patch: Partial<AnimationSettings> = {};
      if (isNum(p.breathingIntensity)) patch.breathingIntensity = p.breathingIntensity;
      if (isNum(p.breathingRate)) patch.breathingRate = p.breathingRate;
      if (typeof p.autoBlink === 'boolean') patch.autoBlink = p.autoBlink;
      if (isNum(p.headMotion)) patch.headMotion = p.headMotion;
      if (oneOf(LOOK_MODES, p.lookMode)) patch.lookMode = p.lookMode;
      if (isNum(p.emotionSpeed)) patch.emotionSpeed = p.emotionSpeed;
      return Object.keys(patch).length ? { type: 'settings', patch } : null;
    }
    case 'camera':
      return oneOf(CAMERA_PRESETS, raw.preset) ? { type: 'camera', preset: raw.preset } : null;
    case 'lighting':
      return oneOf(LIGHTING_PRESETS, raw.preset) ? { type: 'lighting', preset: raw.preset } : null;
    default:
      return null;
  }
}

/** Aplica ao controlador de animação os comandos que são dele. Retorna true se consumiu. */
export function applyAnimationCommand(ctrl: AnimationController, cmd: ControlCommand): boolean {
  switch (cmd.type) {
    case 'emotion':
      ctrl.setEmotion(cmd.emotion, cmd.intensity ?? 1);
      return true;
    case 'gesture':
      ctrl.playGesture(cmd.gesture);
      return true;
    case 'blink':
      ctrl.triggerBlink();
      return true;
    case 'demon':
      ctrl.setDemon(cmd.value);
      return true;
    case 'settings':
      ctrl.updateSettings(cmd.patch);
      return true;
    default:
      return false;
  }
}
