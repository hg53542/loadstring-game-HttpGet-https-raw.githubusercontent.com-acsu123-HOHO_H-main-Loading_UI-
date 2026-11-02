import type { Emotion, GestureName } from '@/core/animation/types';

export const EMOTION_LABELS: Record<Emotion, string> = {
  neutral: '😐 Neutro',
  happy: '😄 Feliz',
  angry: '😠 Bravo',
  sad: '😢 Triste',
  surprised: '😲 Surpreso',
  relaxed: '😌 Relaxado',
};

export const GESTURE_LABELS: Record<GestureName, string> = {
  wave: '👋 Acenar',
  nod: '🙂 Concordar',
  shake: '🙅 Negar',
  laugh: '😂 Rir',
  celebrate: '🎉 Comemorar',
  think: '🤔 Pensar',
  point: '👉 Apontar',
  shrug: '🤷 Dar de ombros',
};
