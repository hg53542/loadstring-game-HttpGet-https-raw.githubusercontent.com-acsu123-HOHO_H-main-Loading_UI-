import { ClientOnly } from '@/ui/ClientOnly';

export const metadata = { title: 'LEVI 3D — Visualizador' };

export default function ViewerPage() {
  return <ClientOnly view="viewer" />;
}
