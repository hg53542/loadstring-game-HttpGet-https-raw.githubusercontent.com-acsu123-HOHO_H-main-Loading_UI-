'use client';

import { useEffect, useState } from 'react';
import { AvatarStage } from '@/avatar/AvatarStage';
import { useCinematicStore } from '@/state/cinematicStore';
import { useLeviRuntime } from '@/state/useLeviRuntime';
import { useSceneStore } from '@/state/sceneStore';
import { StageBadge } from './StageBadge';
import { parseUrlOptions } from './urlOptions';

/** Tela limpa para captura (OBS). Recebe comandos do painel pela outra aba. */
export default function ViewerScreen() {
  const [opts] = useState(() => parseUrlOptions(window.location.search));
  const { controller, fx, onClipEnded } = useLeviRuntime();
  const audioBlocked = useCinematicStore((s) => s.audioBlocked);
  const setAudioBlocked = useCinematicStore((s) => s.setAudioBlocked);

  useEffect(() => {
    const s = useSceneStore.getState();
    if (opts.camera) s.setCamera(opts.camera);
    if (opts.lighting) s.setLighting(opts.lighting);
    if (opts.avatar) s.setAvatarMode(opts.avatar);
    if (opts.vrm) s.setAvatarMode('3d');
    document.body.classList.toggle('transparent', opts.transparent);
  }, [opts]);

  return (
    <div className="viewer" onClick={() => audioBlocked && setAudioBlocked(false)}>
      {!opts.hideBadge && <StageBadge />}
      <div className="viewer-frame">
        <AvatarStage
          controller={controller}
          fx={fx}
          onClipEnded={onClipEnded}
          transparent={opts.transparent}
          quality={opts.quality}
          vrmUrl={opts.vrm}
        />
      </div>
      {audioBlocked && (
        <button className="btn audio-unlock" onClick={() => setAudioBlocked(false)}>
          🔊 Clique para liberar o som dos clipes
        </button>
      )}
    </div>
  );
}
