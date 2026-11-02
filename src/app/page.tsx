import Link from 'next/link';

const ETAPAS: [string, string][] = [
  ['1. Base + avatar 3D', '✅ Entregue: avatar provisório, respiração, piscadas, cabeça, emoções, gestos, transformação, painel'],
  ['2. Voz + sincronização labial', '⏳ Próxima etapa'],
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
      <p style={{ color: 'var(--muted)' }}>Apresentador virtual 3D para lives. Versão 0.1 — base do projeto.</p>
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
