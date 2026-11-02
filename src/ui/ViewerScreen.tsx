'use client';

import { useEffect, useState } from 'react';
import { AvatarStage } from '@/avatar/AvatarStage';
import { useLeviRuntime } from '@/state/useLeviRuntime';
import { useSceneStore } from '@/state/sceneStore';
import { parseUrlOptions } from './urlOptions';

/** Tela limpa para captura (OBS). Recebe comandos do painel pela outra aba. */
export default function ViewerScreen() {
  const [opts] = useState(() => parseUrlOptions(window.location.search));
  const { controller } = useLeviRuntime();
  const rig = useSceneStore((s) => s.rig);

  useEffect(() => {
    const s = useSceneStore.getState();
    if (opts.camera) s.setCamera(opts.camera);
    if (opts.lighting) s.setLighting(opts.lighting);
    document.body.classList.toggle('transparent', opts.transparent);
  }, [opts]);

  return (
    <div className="viewer">
      {rig?.isPlaceholder && !opts.hideBadge && <div className="badge-placeholder">MODELO PROVISÓRIO</div>}
      <div className="viewer-frame">
        <AvatarStage controller={controller} transparent={opts.transparent} quality={opts.quality} vrmUrl={opts.vrm} />
      </div>
    </div>
  );
}
