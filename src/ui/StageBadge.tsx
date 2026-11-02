'use client';

import { useCinematicStore } from '@/state/cinematicStore';
import { useSceneStore } from '@/state/sceneStore';

/** Selo honesto sobre o que está na tela: modelo provisório ou clipe de teste. */
export function StageBadge() {
  const rig = useSceneStore((s) => s.rig);
  const mode = useSceneStore((s) => s.avatarMode);
  const clip = useCinematicStore((s) => s.current);
  const text = clip
    ? clip.isPlaceholder
      ? 'CLIPE DE TESTE'
      : null
    : mode === '25d'
      ? 'DEMO 2.5D — ARTE PROVISÓRIA'
      : rig?.isPlaceholder
        ? 'MODELO PROVISÓRIO'
        : null;
  return text ? <div className="badge-placeholder">{text}</div> : null;
}
