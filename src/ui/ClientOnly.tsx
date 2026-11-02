'use client';

import dynamic from 'next/dynamic';

const Loading = () => <p style={{ padding: 20, color: 'var(--muted)' }}>Carregando cena 3D…</p>;

// WebGL só existe no navegador: estas telas nunca são renderizadas no servidor.
const Viewer = dynamic(() => import('./ViewerScreen'), { ssr: false, loading: Loading });
const Admin = dynamic(() => import('./AdminScreen'), { ssr: false, loading: Loading });

export function ClientOnly({ view }: { view: 'viewer' | 'admin' }) {
  return view === 'viewer' ? <Viewer /> : <Admin />;
}
