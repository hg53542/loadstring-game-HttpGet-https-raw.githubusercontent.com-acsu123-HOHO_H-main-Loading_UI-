'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import type { AnimationController } from '@/core/animation/AnimationController';
import { useSceneStore } from '@/state/sceneStore';
import { ProceduralRig } from './rigs/ProceduralRig';
import type { AvatarRig } from './rigs/types';
import { VrmRig } from './rigs/VrmRig';
import { loadVrm } from './vrm/loadVrm';

interface Props {
  controller: AnimationController;
  /** URL de um .vrm. Sem URL, usa o modelo provisório procedural. */
  vrmUrl?: string | null;
  /** Só marque true para o personagem final aprovado. */
  vrmIsFinal?: boolean;
}

export function LeviAvatar({ controller, vrmUrl, vrmIsFinal = false }: Props) {
  const [rig, setRig] = useState<AvatarRig | null>(null);
  const setRigInfo = useSceneStore((s) => s.setRig);
  const setError = useSceneStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;
    let created: AvatarRig | null = null;
    const use = (r: AvatarRig) => {
      created = r;
      setRig(r);
      setRigInfo({ kind: r.kind, label: r.label, isPlaceholder: r.isPlaceholder });
    };
    if (vrmUrl) {
      loadVrm(vrmUrl)
        .then((vrm) => {
          if (cancelled) return new VrmRig(vrm).dispose();
          setError(null);
          use(new VrmRig(vrm, { isPlaceholder: !vrmIsFinal }));
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(`Falha ao carregar VRM: ${err instanceof Error ? err.message : String(err)}. Usando modelo provisório.`);
          use(new ProceduralRig());
        });
    } else {
      use(new ProceduralRig());
    }
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [vrmUrl, vrmIsFinal, setRigInfo, setError]);

  useFrame((_, dt) => {
    if (rig) rig.apply(controller.update(dt), dt);
  });

  return rig ? <primitive object={rig.root} /> : null;
}
