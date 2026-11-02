'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimationController } from '@/core/animation/AnimationController';
import { ClipQueue, parseClipManifest, type EnqueueResult } from '@/core/clips/clips';
import { createBroadcastBus, type ControlBus } from '@/core/control/bus';
import { applyAnimationCommand, type ControlCommand } from '@/core/control/commands';
import { FxTimeline } from '@/core/fx/effects';
import { describeEvent, reactTo, type LiveEvent } from '@/core/reactions/rules';
import { Speaker } from '@/voice/Speaker';
import { useCinematicStore } from './cinematicStore';
import { useSceneStore } from './sceneStore';

export const MANIFEST_URL = '/clips/clips.json';
const now = () => performance.now() / 1000;

const ENQUEUE_MSG: Record<EnqueueResult, string> = {
  tocando: 'tocando agora',
  'na-fila': 'entrou na fila',
  desconhecido: 'não existe no manifesto',
  'em-cooldown': 'em intervalo mínimo (cooldown)',
  'fila-cheia': 'fila cheia',
  duplicado: 'já está tocando ou na fila',
};

/**
 * Cria, por página, o controlador de animação, a linha do tempo de efeitos e a fila
 * de clipes, e liga tudo ao barramento de comandos.
 * `dispatch` aplica o comando localmente E o transmite para outras abas (ex.: /viewer).
 */
export function useLeviRuntime(opts: { voiceAudio?: boolean } = {}) {
  const [controller] = useState(() => new AnimationController());
  const [speech, setSpeech] = useState({ speaking: false, text: '' });
  const speakerRef = useRef<Speaker | null>(null);
  const voiceAudio = opts.voiceAudio ?? true;
  useEffect(() => {
    const sp = new Speaker(controller, { withAudio: voiceAudio, onState: setSpeech });
    speakerRef.current = sp;
    return () => sp.stop();
  }, [controller, voiceAudio]);
  const [fx] = useState(() => new FxTimeline());
  const [clips] = useState(() => new ClipQueue());
  const busRef = useRef<ControlBus | null>(null);

  const syncClips = useCallback(
    (started: boolean) => {
      useCinematicStore.getState().sync(clips, started);
      const intro = started ? clips.current?.clip.introFx : undefined;
      if (started) fx.trigger('flash', now(), 0.7); // transição 3D → clipe
      if (intro) fx.triggerPreset(intro, now());
    },
    [clips, fx],
  );

  const applyLocal = useCallback(
    (cmd: ControlCommand) => {
      if (applyAnimationCommand(controller, cmd)) return;
      const scene = useSceneStore.getState();
      const log = useCinematicStore.getState().addLog;
      switch (cmd.type) {
        case 'camera':
          return scene.setCamera(cmd.preset);
        case 'lighting':
          return scene.setLighting(cmd.preset);
        case 'avatar':
          return scene.setAvatarMode(cmd.mode);
        case 'speak':
          return speakerRef.current?.say(cmd.text);
        case 'speakStop':
          return speakerRef.current?.stop();
        case 'fx':
          return fx.trigger(cmd.effect, now(), cmd.intensity ?? 1);
        case 'fxPreset':
          return fx.triggerPreset(cmd.preset, now(), cmd.intensity ?? 1);
        case 'clip': {
          if (cmd.action === 'play') {
            const r = clips.enqueue(cmd.id, now());
            log(`Clipe "${cmd.id}": ${ENQUEUE_MSG[r]}`);
            return syncClips(r === 'tocando');
          }
          if (cmd.action === 'skip') {
            const next = clips.skip(now());
            return syncClips(next !== null);
          }
          clips.clear();
          return syncClips(false);
        }
      }
    },
    [controller, fx, clips, syncClips],
  );

  // Carrega a biblioteca de clipes.
  useEffect(() => {
    let alive = true;
    fetch(MANIFEST_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: unknown) => {
        if (!alive) return;
        const { clips: list, errors } = parseClipManifest(json);
        clips.setClips(list);
        useCinematicStore.getState().setLibrary(list, errors);
      })
      .catch((e: unknown) => {
        if (alive) useCinematicStore.getState().setLibrary([], [`Não foi possível ler ${MANIFEST_URL}: ${String(e)}`]);
      });
    return () => {
      alive = false;
    };
  }, [clips]);

  useEffect(() => {
    const bus = createBroadcastBus();
    busRef.current = bus;
    const unsub = bus.subscribe(applyLocal);
    return () => {
      unsub();
      bus.close();
      busRef.current = null;
    };
  }, [applyLocal]);

  const dispatch = useCallback(
    (cmd: ControlCommand) => {
      applyLocal(cmd);
      busRef.current?.send(cmd);
    },
    [applyLocal],
  );

  /** Chamado pelo reprodutor quando o vídeo acaba ou falha. Local: cada aba toca a própria fila. */
  const onClipEnded = useCallback(() => {
    const next = clips.finish(now());
    fx.trigger('flash', now(), 0.5); // transição clipe → 3D
    syncClips(next !== null);
  }, [clips, fx, syncClips]);

  /** Executa as regras de reação para um evento da live (real ou simulado). */
  const handleEvent = useCallback(
    (ev: LiveEvent) => {
      useCinematicStore.getState().addLog(describeEvent(ev));
      for (const cmd of reactTo(ev)) dispatch(cmd);
    },
    [dispatch],
  );

  return { controller, fx, dispatch, onClipEnded, handleEvent, speech };
}
