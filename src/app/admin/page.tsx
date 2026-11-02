import { ClientOnly } from '@/ui/ClientOnly';

export const metadata = { title: 'LEVI 3D — Painel' };

export default function AdminPage() {
  return <ClientOnly view="admin" />;
}
