import { BlinkLayer } from './layers/blink';
import { BreathingLayer } from './layers/breathing';
import { DemonLayer } from './layers/demon';
import { EmotionLayer } from './layers/emotions';
import { GestureLayer } from './layers/gestures';
import { HeadMotionLayer } from './layers/headMotion';
import { IdleLayer } from './layers/idle';
import { TalkLayer, type Visemes } from './layers/talk';
import { clamp, clamp01, createRestPose, createRng } from './math';
import {
  DEFAULT_SETTINGS,
  EXPRESSIONS,
  LOOK_MODES,
  type AnimationSettings,
  type Emotion,
  type GestureName,
  type Pose,
} from './types';

export interface AnimationState {
  emotion: Emotion;
  emotionIntensity: number;
  gesture: GestureName | null;
  demon: number;
  demonTarget: number;
  blinkCount: number;
  speaking: boolean;
  settings: AnimationSettings;
}

/** Dt máximo por quadro: evita "saltos" quando a aba fica em segundo plano. */
const MAX_DT = 0.1;

/**
 * Orquestra todas as camadas e gera uma `Pose` por quadro.
 * É independente de renderização: o mesmo controlador anima o modelo
 * provisório ou um VRM final, e pode rodar em testes sem navegador.
 */
export class AnimationController {
  settings: AnimationSettings;
  readonly breathing = new BreathingLayer();
  readonly blink: BlinkLayer;
  readonly head: HeadMotionLayer;
  readonly emotion = new EmotionLayer();
  readonly gestures = new GestureLayer();
  readonly demon = new DemonLayer();
  readonly idle: IdleLayer;
  readonly talk: TalkLayer;
  time = 0;
  private pose: Pose = createRestPose();

  constructor(opts: { seed?: number; settings?: Partial<AnimationSettings> } = {}) {
    const rng = createRng(opts.seed ?? Date.now());
    this.blink = new BlinkLayer(rng);
    this.head = new HeadMotionLayer(rng);
    this.idle = new IdleLayer(rng);
    this.talk = new TalkLayer(rng);
    this.settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...opts.settings });
  }

  update(dt: number): Pose {
    const d = clamp(Number.isFinite(dt) ? dt : 0, 0, MAX_DT);
    this.time += d;
    const s = this.settings;

    this.breathing.update(d, s);
    this.blink.update(d, s.autoBlink);
    this.head.update(d, s);
    this.emotion.update(d, s);
    this.gestures.update(d);
    this.demon.update(d);
    this.idle.update(d);
    this.talk.update(d);

    const pose = createRestPose();
    this.breathing.apply(pose, s);
    this.emotion.apply(pose);
    this.demon.apply(pose);
    // Postura ociosa some durante gestos grandes.
    this.idle.apply(pose, s.idleMotion * (this.gestures.active ? 0.3 : 1));
    this.head.apply(pose, s);
    this.talk.apply(pose);
    this.gestures.apply(pose);
    this.blink.apply(pose);

    // Surpresa arregala os olhos: reduz piscadas parcialmente.
    pose.expressions.blink *= 1 - 0.5 * pose.expressions.surprised;
    for (const e of EXPRESSIONS) pose.expressions[e] = clamp01(pose.expressions[e]);

    this.pose = pose;
    return pose;
  }

  get currentPose(): Pose {
    return this.pose;
  }

  setEmotion(emotion: Emotion, intensity = 1) {
    this.emotion.set(emotion, intensity);
  }

  playGesture(name: GestureName) {
    this.gestures.play(name);
  }

  /** Visemas da fala atual (vindos do módulo de voz). */
  setVisemes(v: Visemes) {
    this.talk.setVisemes(v);
  }

  triggerBlink() {
    this.blink.trigger();
  }

  setDemon(target: number) {
    this.demon.set(target);
  }

  updateSettings(patch: Partial<AnimationSettings>) {
    this.settings = sanitizeSettings({ ...this.settings, ...patch });
  }

  getState(): AnimationState {
    return {
      emotion: this.emotion.target,
      emotionIntensity: this.emotion.intensity,
      gesture: this.gestures.active?.name ?? null,
      demon: this.demon.value,
      demonTarget: this.demon.target,
      blinkCount: this.blink.count,
      speaking: this.talk.speaking,
      settings: { ...this.settings },
    };
  }
}

export function sanitizeSettings(s: AnimationSettings): AnimationSettings {
  const num = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback;
  return {
    breathingIntensity: num(s.breathingIntensity, DEFAULT_SETTINGS.breathingIntensity, 0, 3),
    breathingRate: num(s.breathingRate, DEFAULT_SETTINGS.breathingRate, 4, 40),
    autoBlink: typeof s.autoBlink === 'boolean' ? s.autoBlink : DEFAULT_SETTINGS.autoBlink,
    headMotion: num(s.headMotion, DEFAULT_SETTINGS.headMotion, 0, 3),
    idleMotion: num(s.idleMotion, DEFAULT_SETTINGS.idleMotion, 0, 3),
    lookMode: (LOOK_MODES as readonly string[]).includes(s.lookMode) ? s.lookMode : DEFAULT_SETTINGS.lookMode,
    emotionSpeed: num(s.emotionSpeed, DEFAULT_SETTINGS.emotionSpeed, 0.5, 20),
  };
}
