'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimationController } from '@/core/animation/AnimationController';
import { createBroadcastBus, type ControlBus } from '@/core/control/bus';
import { applyAnimationCommand, type ControlCommand } from '@/core/control/commands';
import { useSceneStore } from './sceneStore';

/**
 * Cria o controlador de animação da página e o liga ao barramento de comandos.
 * `dispatch` aplica o comando localmente E o transmite para outras abas (ex.: /viewer).
 */
export function useLeviRuntime() {
  const [controller] = useState(() => new AnimationController());
  const busRef = useRef<ControlBus | null>(null);

  const applyLocal = useCallback(
    (cmd: ControlCommand) => {
      if (applyAnimationCommand(controller, cmd)) return;
      const s = useSceneStore.getState();
      if (cmd.type === 'camera') s.setCamera(cmd.preset);
      else if (cmd.type === 'lighting') s.setLighting(cmd.preset);
    },
    [controller],
  );

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

  return { controller, dispatch };
}
