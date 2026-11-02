import { create } from 'zustand';
import type { ClipDef, ClipQueue, QueueItem } from '@/core/clips/clips';

export interface ClipSnapshot {
  id: string;
  title: string;
  src: string;
  source: string;
  isPlaceholder: boolean;
}

interface CinematicState {
  library: ClipDef[];
  manifestErrors: string[];
  current: ClipSnapshot | null;
  pending: ClipSnapshot[];
  /** Incrementa a cada novo clipe iniciado — força remontar o <video> mesmo se o id repetir. */
  playToken: number;
  log: string[];
  audioBlocked: boolean;
  /** `started` = um clipe novo começou agora (remonta o vídeo). */
  sync: (q: ClipQueue, started: boolean) => void;
  setLibrary: (clips: ClipDef[], errors: string[]) => void;
  addLog: (line: string) => void;
  setAudioBlocked: (v: boolean) => void;
}

const snap = (i: QueueItem): ClipSnapshot => ({
  id: i.clip.id,
  title: i.clip.title,
  src: i.clip.src,
  source: i.source,
  isPlaceholder: i.clip.isPlaceholder,
});

export const useCinematicStore = create<CinematicState>((set, get) => ({
  library: [],
  manifestErrors: [],
  current: null,
  pending: [],
  playToken: 0,
  log: [],
  audioBlocked: false,
  sync: (q, started) =>
    set({
      current: q.current ? snap(q.current) : null,
      pending: q.pending.map(snap),
      playToken: started ? get().playToken + 1 : get().playToken,
    }),
  setLibrary: (library, manifestErrors) => set({ library, manifestErrors }),
  addLog: (line) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    set({ log: [`${time} ${line}`, ...get().log].slice(0, 30) });
  },
  setAudioBlocked: (audioBlocked) => set({ audioBlocked }),
}));
