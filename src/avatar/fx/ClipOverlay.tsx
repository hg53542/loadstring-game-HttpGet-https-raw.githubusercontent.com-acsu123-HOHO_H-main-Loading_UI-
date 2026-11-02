'use client';

import { useEffect, useRef, useState } from 'react';
import { useCinematicStore } from '@/state/cinematicStore';

/**
 * Reprodutor dos clipes cinematográficos. Cobre a cena 3D enquanto o clipe toca,
 * com entrada/saída em fade; ao terminar (ou falhar) avisa o runtime.
 */
export function ClipOverlay({ muted, onEnded }: { muted: boolean; onEnded: () => void }) {
  const current = useCinematicStore((s) => s.current);
  const token = useCinematicStore((s) => s.playToken);
  const setAudioBlocked = useCinematicStore((s) => s.setAudioBlocked);
  const addLog = useCinematicStore((s) => s.addLog);
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    const v = video.current;
    if (!current || !v) {
      setVisible(false);
      return;
    }
    v.muted = muted;
    v.currentTime = 0;
    setVisible(false);
    const show = () => setVisible(true);
    v.addEventListener('playing', show, { once: true });
    v.play().catch(() => {
      // Navegadores bloqueiam áudio sem interação do usuário: toca mudo e avisa.
      setAudioBlocked(true);
      v.muted = true;
      v.play().catch((e: unknown) => {
        addLog(`Falha ao tocar "${current.id}": ${String(e)}`);
        endedRef.current();
      });
    });
    return () => v.removeEventListener('playing', show);
  }, [current, token, muted, setAudioBlocked, addLog]);

  return (
    <video
      ref={video}
      key={token}
      src={current?.src}
      playsInline
      preload="auto"
      data-testid="clip-overlay"
      data-clip={current?.id ?? ''}
      data-visible={visible ? '1' : '0'}
      onEnded={() => endedRef.current()}
      onError={() => {
        if (!current) return;
        addLog(`Arquivo do clipe "${current.id}" não encontrado ou inválido (${current.src}).`);
        endedRef.current();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 2,
        background: '#000',
        opacity: current && visible ? 1 : 0,
        transition: 'opacity 250ms ease',
        pointerEvents: 'none',
        display: current ? 'block' : 'none',
      }}
    />
  );
}
