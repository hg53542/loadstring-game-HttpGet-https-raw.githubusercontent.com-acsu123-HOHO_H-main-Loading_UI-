import { clamp } from '../animation/math';
import type { Pose } from '../animation/types';

/**
 * Converte a `Pose` genérica em parâmetros no padrão Live2D Cubism
 * (IDs "standard parameters" usados pela maioria dos modelos).
 *
 * É o contrato entre a animação e qualquer personagem 2.5D:
 *  - o boneco 2.5D desta demonstração (src/avatar/puppet) lê estes parâmetros;
 *  - um modelo Live2D profissional receberia exatamente os mesmos valores.
 *
 * Convenções: ângulos em graus (±30), olhos 0 = fechado / 1 = aberto,
 * boca form −1 = triste / +1 = sorriso.
 */
export const LIVE2D_PARAMS = [
  'ParamAngleX',
  'ParamAngleY',
  'ParamAngleZ',
  'ParamBodyAngleX',
  'ParamBodyAngleY',
  'ParamBodyAngleZ',
  'ParamBreath',
  'ParamEyeLOpen',
  'ParamEyeROpen',
  'ParamEyeLSmile',
  'ParamEyeRSmile',
  'ParamEyeBallX',
  'ParamEyeBallY',
  'ParamBrowLY',
  'ParamBrowRY',
  'ParamBrowLAngle',
  'ParamBrowRAngle',
  'ParamMouthForm',
  'ParamMouthOpenY',
  'ParamCheek',
  // Customizados do Levi (um modelo Live2D final deve criá-los com estes nomes)
  'ParamMouthSmirk',
  'ParamMouthWide',
  'ParamMouthRound',
  'ParamDemon',
] as const;
export type Live2DParam = (typeof LIVE2D_PARAMS)[number];
export type Live2DParams = Record<Live2DParam, number>;

const DEG = 180 / Math.PI;

export function poseToLive2D(p: Pose): Live2DParams {
  const b = p.bones;
  const e = p.expressions;
  const headYaw = b.head.y + b.neck.y;
  const headPitch = -(b.head.x + b.neck.x);
  const headRoll = b.head.z + b.neck.z;
  const bodyYaw = b.chest.y + b.spine.y + b.upperChest.y;
  const bodyPitch = -(b.chest.x + b.spine.x + b.upperChest.x);
  const bodyRoll = b.chest.z + b.spine.z + b.hips.z;

  // Olhos: piscar fecha; sorriso e concentração estreitam; surpresa arregala.
  const narrow = 0.3 * e.happy + 0.35 * e.focus + 0.15 * e.angry + 0.15 * e.relaxed;
  const wide = 0.25 * e.surprised;
  const openBase = clamp(1 - narrow + wide, 0, 1.25);
  const blinkL = Math.max(e.blink, e.blinkLeft);
  const blinkR = Math.max(e.blink, e.blinkRight);
  // Riso forte fecha os olhos em "^^".
  const smile = clamp(e.happy * 1.0 + e.smirk * 0.2, 0, 1);
  const smileClose = clamp((e.happy - 0.75) * 4, 0, 1) * clamp(e.aa * 2, 0, 1);

  const browUp = 0.8 * e.surprised + 0.5 * e.browUp + 0.3 * e.sad - 0.6 * e.angry - 0.45 * e.focus;
  const browAngle = -0.9 * e.angry + 0.8 * e.sad - 0.4 * e.focus + 0.2 * e.surprised;

  const open = clamp(Math.max(e.aa, e.oh * 0.9, e.ou * 0.6, e.ee * 0.5, e.ih * 0.4, e.surprised * 0.3), 0, 1);
  const form = clamp(e.happy * 0.9 + e.relaxed * 0.4 + e.smirk * 0.3 - e.sad * 0.9 - e.angry * 0.5, -1, 1);

  return {
    ParamAngleX: clamp(headYaw * DEG, -30, 30),
    ParamAngleY: clamp(headPitch * DEG, -30, 30),
    ParamAngleZ: clamp(-headRoll * DEG, -30, 30),
    ParamBodyAngleX: clamp(bodyYaw * DEG, -10, 10),
    ParamBodyAngleY: clamp(bodyPitch * DEG, -10, 10),
    ParamBodyAngleZ: clamp(-bodyRoll * DEG, -10, 10),
    ParamBreath: clamp(p.breath, 0, 1),
    ParamEyeLOpen: clamp(openBase * (1 - blinkL) * (1 - smileClose), 0, 1.25),
    ParamEyeROpen: clamp(openBase * (1 - blinkR) * (1 - smileClose), 0, 1.25),
    ParamEyeLSmile: Math.max(smile * 0.8, smileClose),
    ParamEyeRSmile: Math.max(smile * 0.8, smileClose),
    ParamEyeBallX: clamp(p.lookAt.yaw / 0.45, -1, 1),
    ParamEyeBallY: clamp(p.lookAt.pitch / 0.3, -1, 1),
    ParamBrowLY: clamp(browUp, -1, 1),
    ParamBrowRY: clamp(browUp + 0.15 * e.smirk, -1, 1),
    ParamBrowLAngle: clamp(browAngle, -1, 1),
    ParamBrowRAngle: clamp(browAngle, -1, 1),
    ParamMouthForm: form,
    ParamMouthOpenY: open,
    ParamCheek: clamp(e.happy * 0.5 + e.surprised * 0.2, 0, 1),
    ParamMouthSmirk: clamp(e.smirk, 0, 1),
    ParamMouthWide: clamp(e.ee * 0.8 + e.ih * 0.6 + e.happy * 0.3 - e.ou * 0.8 - e.oh * 0.4, -1, 1),
    ParamMouthRound: clamp(Math.max(e.ou, e.oh * 0.8), 0, 1),
    ParamDemon: clamp(p.demon, 0, 1),
  };
}
