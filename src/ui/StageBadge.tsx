'use client';

import { useCinematicStore } from '@/state/cinematicStore';
import { useSceneStore } from '@/state/sceneStore';

/** Selo honesto sobre o que está na tela: modelo provisório ou clipe de teste. */
export function StageBadge() {
  const rig = useSceneStore((s) => s.rig);
  const clip = useCinematicStore((s) => s.current);
  const text = clip ? (clip.isPlaceholder ? 'CLIPE DE TESTE' : null) : rig?.isPlaceholder ? 'MODELO PROVISÓRIO' : null;
  return text ? <div className="badge-placeholder">{text}</div> : null;
}
