import Link from 'next/link';

const ETAPAS: [string, string][] = [
  ['1. Base + avatar 3D', '✅ Entregue: avatar provisório, respiração, piscadas, cabeça, emoções, gestos, transformação, painel'],
  ['1.5 Momentos cinematográficos', '✅ Entregue: efeitos de anime ao vivo, clipes de IA com fila, regras de reação, simulador'],
  ['1.6 Visual anime 2.5D', '✅ Entregue: personagem 2.5D original, física de cabelo/roupa, 10 emoções, fala com boca sincronizada (voz do sistema)'],
  ['2. Voz + sincronização labial', '⏳ Próxima etapa (voz brasileira dedicada)'],
  ['3. IA conversacional + memória', '⏳ Planejada'],
  ['4. TikTok LIVE', '⏳ Planejada'],
  ['5. OBS (cenas verticais)', '⏳ Planejada'],
  ['6. Cenários 3D', '⏳ Planejada'],
  ['7. Batalhas', '⏳ Planejada'],
  ['8. Universo persistente', '⏳ Planejada'],
];

export default function Home() {
  return (
    <main className="home">
      <h1>
        ZYNOX LIVE IA — <span>LEVI 3D</span>
      </h1>
      <p style={{ color: 'var(--muted)' }}>Apresentador virtual 3D para lives. Versão 0.3 — Levi anime 2.5D.</p>
      <div className="cards">
        <Link className="card" href="/admin">
          <b>Painel de controle →</b>
          <small>Pré-visualização + controles de animação, câmera e luz.</small>
        </Link>
        <Link className="card" href="/viewer">
          <b>Visualizador →</b>
          <small>Tela cheia, vertical. Use no OBS com ?transparent=1.</small>
        </Link>
      </div>
      <h2>Etapas</h2>
      <table>
        <tbody>
          {ETAPAS.map(([nome, status]) => (
            <tr key={nome}>
              <td>{nome}</td>
              <td>{status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
