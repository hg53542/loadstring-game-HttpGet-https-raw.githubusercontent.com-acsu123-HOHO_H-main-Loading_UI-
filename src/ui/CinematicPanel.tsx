'use client';

import type { ControlCommand } from '@/core/control/commands';
import { FX_EFFECTS, FX_PRESET_DEFS, FX_PRESETS, type FxEffect } from '@/core/fx/effects';
import { DEFAULT_REACTIONS, type LiveEvent } from '@/core/reactions/rules';
import { useCinematicStore } from '@/state/cinematicStore';

const FX_LABELS: Record<FxEffect, string> = {
  speedLines: 'Linhas de velocidade',
  lightning: 'Raios',
  shatter: 'Vidro estilhaçado',
  cosmos: 'Fundo cósmico',
  flash: 'Flash',
  shake: 'Tremor de câmera',
};

/** Eventos de TESTE. Sempre marcados como simulados — não representam presentes reais. */
const SIMULATIONS: { label: string; event: LiveEvent }[] = [
  { label: '🌹 Presente pequeno (1)', event: { type: 'gift', user: 'teste_ana', gift: 'Rosa', coins: 1, count: 1, simulated: true } },
  {
    label: `🎁 Presente grande (${DEFAULT_REACTIONS.giftBig})`,
    event: { type: 'gift', user: 'teste_joao', gift: 'Presente', coins: DEFAULT_REACTIONS.giftBig, count: 1, simulated: true },
  },
  {
    label: `🐉 Presente lendário (${DEFAULT_REACTIONS.giftLegendary})`,
    event: { type: 'gift', user: 'teste_bia', gift: 'Dragão', coins: DEFAULT_REACTIONS.giftLegendary, count: 1, simulated: true },
  },
  { label: '➕ Novo seguidor', event: { type: 'follow', user: 'teste_caio', simulated: true } },
  { label: '❤️ 100 curtidas', event: { type: 'likes', user: 'teste_lu', count: 100, simulated: true } },
  { label: '🔁 Compartilhou', event: { type: 'share', user: 'teste_rafa', simulated: true } },
];

export function CinematicPanel({
  dispatch,
  handleEvent,
}: {
  dispatch: (cmd: ControlCommand) => void;
  handleEvent: (ev: LiveEvent) => void;
}) {
  const { library, manifestErrors, current, pending, log, audioBlocked } = useCinematicStore();

  return (
    <>
      <section className="section">
        <h2>Efeitos de anime (ao vivo)</h2>
        <div className="row">
          {FX_PRESETS.map((p) => (
            <button key={p} data-testid={`fxpreset-${p}`} className="btn" onClick={() => dispatch({ type: 'fxPreset', preset: p })}>
              {FX_PRESET_DEFS[p].label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          {FX_EFFECTS.map((e) => (
            <button key={e} className="btn" style={{ fontSize: 12 }} onClick={() => dispatch({ type: 'fx', effect: e })}>
              {FX_LABELS[e]}
            </button>
          ))}
        </div>
        <p className="hint">
          Atalhos: <kbd>6</kbd> impacto <kbd>7</kbd> poder <kbd>8</kbd> vidro <kbd>9</kbd> domínio cósmico
        </p>
      </section>

      <section className="section">
        <h2>Clipes cinematográficos</h2>
        <dl className="stat">
          <dt>Tocando</dt>
          <dd data-testid="clip-current">
            {current ? (
              <>
                {current.title} {current.isPlaceholder && <span className="tag warn">teste</span>}
              </>
            ) : (
              '— (avatar 3D ao vivo)'
            )}
          </dd>
          <dt>Na fila</dt>
          <dd data-testid="clip-pending">{pending.length ? pending.map((p) => p.title).join(', ') : '—'}</dd>
        </dl>
        <div className="row" style={{ marginTop: 8 }}>
          {library.map((c) => (
            <button key={c.id} data-testid={`clip-${c.id}`} className="btn" onClick={() => dispatch({ type: 'clip', action: 'play', id: c.id })}>
              ▶ {c.title}
              {c.priority === 'alta' ? ' ⭐' : ''}
            </button>
          ))}
          {!library.length && <span className="hint">Nenhum clipe no manifesto.</span>}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => dispatch({ type: 'clip', action: 'skip' })} disabled={!current}>
            ⏭ Pular
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'clip', action: 'clear' })} disabled={!current && !pending.length}>
            ⏹ Parar e limpar fila
          </button>
        </div>
        {manifestErrors.map((e) => (
          <p key={e} className="error">
            {e}
          </p>
        ))}
        {audioBlocked && <p className="hint">O navegador bloqueou o som automático; os clipes tocam mudos até você clicar na página.</p>}
        <p className="hint">
          Na prévia do painel os clipes tocam <b>sem som</b> (o som sai no /viewer, para não duplicar). Biblioteca em{' '}
          <code>public/clips/clips.json</code> — veja <code>docs/CLIPES.md</code>.
        </p>
      </section>

      <section className="section">
        <h2>Simular eventos da live (teste)</h2>
        <div className="row">
          {SIMULATIONS.map((s) => (
            <button key={s.label} className="btn" onClick={() => handleEvent(s.event)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="hint">
          Eventos simulados aparecem como <b>[SIMULADO]</b> e servem só para testar as reações. Os eventos reais virão da
          integração com o TikTok (etapa 4).
        </p>
        <ol className="log" data-testid="event-log">
          {log.map((l, i) => (
            <li key={`${i}-${l}`}>{l}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
