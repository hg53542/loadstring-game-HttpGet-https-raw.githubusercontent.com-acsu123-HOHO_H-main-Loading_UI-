/**
 * Tipos centrais do sistema de animação.
 *
 * O núcleo de animação NÃO conhece Three.js nem React: ele só produz uma `Pose`
 * (rotações de ossos humanoides + pesos de expressões) a cada quadro.
 * Quem aplica essa pose a um modelo é um "rig" (ver src/avatar/rigs).
 *
 * Convenções (iguais ao VRM 1.0 normalizado):
 *  - O personagem olha para +Z, a esquerda DELE é +X, para cima é +Y.
 *  - Rotações são ângulos de Euler em radianos (ordem XYZ), relativos à pose de descanso (T-pose).
 *  - Rotação X positiva inclina para frente/baixo; Y positiva gira para a esquerda do personagem.
 */

export const HUMAN_BONES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
] as const;
export type HumanBone = (typeof HUMAN_BONES)[number];

/**
 * Expressões: presets do VRM 1.0 + 3 expressões customizadas do Levi
 * (`smirk` = sorriso de canto, `focus` = olhar concentrado, `browUp` = ênfase com
 * sobrancelhas). Modelos que não tiverem as customizadas simplesmente as ignoram.
 */
export const EXPRESSIONS = [
  'blink',
  'blinkLeft',
  'blinkRight',
  'happy',
  'angry',
  'sad',
  'surprised',
  'relaxed',
  'aa',
  'ih',
  'ou',
  'ee',
  'oh',
  'smirk',
  'focus',
  'browUp',
] as const;
export type ExpressionName = (typeof EXPRESSIONS)[number];

export interface Euler3 {
  x: number;
  y: number;
  z: number;
}

export interface Pose {
  bones: Record<HumanBone, Euler3>;
  expressions: Record<ExpressionName, number>;
  /** Direção do olhar, em radianos. yaw > 0 = para a esquerda do personagem; pitch > 0 = para cima. */
  lookAt: { yaw: number; pitch: number };
  /** Deslocamento vertical do quadril (em metros), p.ex. pulos de comemoração. */
  hipsOffsetY: number;
  /** Nível da transformação demoníaca (0 = humano, 1 = forma demoníaca completa). */
  demon: number;
  /** Fase da respiração (0 = expirado, 1 = inspirado), já multiplicada pela intensidade. */
  breath: number;
}

export const EMOTIONS = [
  'neutral',
  'happy',
  'angry',
  'sad',
  'surprised',
  'relaxed',
  'confident',
  'teasing',
  'focused',
  'laughing',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const GESTURES = ['wave', 'nod', 'shake', 'laugh', 'celebrate', 'think', 'point', 'shrug'] as const;
export type GestureName = (typeof GESTURES)[number];

export const LOOK_MODES = ['idle', 'camera'] as const;
export type LookMode = (typeof LOOK_MODES)[number];

export interface AnimationSettings {
  /** Multiplicador da amplitude da respiração (0 desliga). */
  breathingIntensity: number;
  /** Respirações por minuto. */
  breathingRate: number;
  /** Piscadas automáticas ligadas. */
  autoBlink: boolean;
  /** Multiplicador dos movimentos ociosos de cabeça (0 desliga). */
  headMotion: number;
  /** Multiplicador das variações de postura em silêncio (0 desliga). */
  idleMotion: number;
  /** 'idle' = olhar vagueia naturalmente; 'camera' = olha para a câmera. */
  lookMode: LookMode;
  /** Velocidade de transição entre emoções (1/s). */
  emotionSpeed: number;
}

export const DEFAULT_SETTINGS: AnimationSettings = {
  breathingIntensity: 1,
  breathingRate: 14,
  autoBlink: true,
  headMotion: 1,
  idleMotion: 1,
  lookMode: 'idle',
  emotionSpeed: 4,
};
