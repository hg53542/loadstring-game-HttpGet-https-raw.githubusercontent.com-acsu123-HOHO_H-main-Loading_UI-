'use client';

import { useEffect, useState } from 'react';
import { MAX_SPEAK_CHARS, type ControlCommand } from '@/core/control/commands';
import { useSceneStore } from '@/state/sceneStore';
import { Speaker } from '@/voice/Speaker';

const EXAMPLES = [
  '[feliz][acenar] Fala, galera! Bem-vindos à live do Levi!',
  '[provocador] Ah, você acha que consegue me vencer? [rir] Kkkk, quero ver!',
  '[confiante] Hoje o reino é nosso. [apontar] E você vem comigo.',
  '[concentrado] Hmm... deixa eu pensar nisso direito. [pensar] Faz sentido.',
  '[surpreso] Opa! Que presente é esse?! [comemorar] Valeu demais!',
  '[triste] Poxa... perdi a batalha. [bravo] Mas na próxima eu volto mais forte!',
];

export function SpeechPanel({ dispatch, speech }: { dispatch: (c: ControlCommand) => void; speech: { speaking: boolean; text: string } }) {
  const [text, setText] = useState(EXAMPLES[0]!);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const mode = useSceneStore((s) => s.avatarMode);

  useEffect(() => {
    const update = () => setVoiceName(Speaker.pickVoice()?.name ?? null);
    update();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener('voiceschanged', update);
    return () => {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.removeEventListener('voiceschanged', update);
    };
  }, []);

  return (
    <>
      <section className="section">
        <h2>Visual do personagem</h2>
        <div className="row">
          <button data-testid="mode-25d" className={`btn ${mode === '25d' ? 'active' : ''}`} onClick={() => dispatch({ type: 'avatar', mode: '25d' })}>
            ✨ Anime 2.5D (demo)
          </button>
          <button data-testid="mode-3d" className={`btn ${mode === '3d' ? 'active' : ''}`} onClick={() => dispatch({ type: 'avatar', mode: '3d' })}>
            🧊 3D / VRM
          </button>
        </div>
        <p className="hint">
          2.5D = desenho anime animado em camadas (estilo Live2D). Arte <b>provisória</b> feita em código; o visual profissional
          vem de uma ilustração + rigging — ver <code>docs/VISUAL.md</code>.
        </p>
      </section>

      <section className="section full">
        <h2>Fazer o Levi falar</h2>
        <textarea
          data-testid="speak-text"
          className="speak-box"
          value={text}
          maxLength={MAX_SPEAK_CHARS}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <button data-testid="speak-go" className="btn active" onClick={() => text.trim() && dispatch({ type: 'speak', text })}>
            🗣️ Falar
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'speakStop' })} disabled={!speech.speaking}>
            ⏹ Parar
          </button>
          <span className="hint" style={{ margin: 0, alignSelf: 'center' }} data-testid="speak-status">
            {speech.speaking ? `Falando: “${speech.text}”` : 'Em silêncio'}
          </span>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          {EXAMPLES.map((ex) => (
            <button key={ex} className="btn" style={{ fontSize: 12 }} onClick={() => setText(ex)}>
              {ex.match(/^\[(\w+)\]/)?.[1] ?? 'exemplo'}
            </button>
          ))}
        </div>
        <p className="hint">
          Etiquetas: emoções <code>[feliz] [bravo] [triste] [surpreso] [confiante] [provocador] [concentrado] [rindo]</code> e gestos{' '}
          <code>[acenar] [concordar] [negar] [rir] [comemorar] [pensar] [apontar] [ombros]</code>. “kkkk”/“haha” viram risada.
          <br />
          Voz: {voiceName ? <b>{voiceName}</b> : <b>nenhuma voz pt-BR encontrada — a boca anima sem som</b>} (voz do sistema, provisória; a voz
          brasileira dedicada é a etapa 2). Se o /viewer estiver aberto, a voz sai nos dois — desative o som de um deles.
        </p>
      </section>
    </>
  );
}
