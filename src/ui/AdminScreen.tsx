'use client';

import { useEffect, useRef, useState } from 'react';
import { AvatarStage } from '@/avatar/AvatarStage';
import { CAMERA_DEFS, LIGHTING_DEFS } from '@/avatar/scene/presets';
import type { AnimationState } from '@/core/animation/AnimationController';
import { EMOTIONS, GESTURES, type AnimationSettings } from '@/core/animation/types';
import { CAMERA_PRESETS, LIGHTING_PRESETS, type CameraPreset, type ControlCommand } from '@/core/control/commands';
import { useSceneStore } from '@/state/sceneStore';
import { useLeviRuntime } from '@/state/useLeviRuntime';
import { EMOTION_LABELS, GESTURE_LABELS } from './labels';
import { parseUrlOptions } from './urlOptions';

const CAMERA_LABELS: Record<CameraPreset, string> = {
  rosto: CAMERA_DEFS.rosto.label,
  busto: CAMERA_DEFS.busto.label,
  corpo: CAMERA_DEFS.corpo.label,
  livre: 'Livre (mouse)',
};

/** Teclas de atalho do painel. */
const SHORTCUTS: Record<string, ControlCommand> = {
  b: { type: 'blink' },
  '1': { type: 'gesture', gesture: 'wave' },
  '2': { type: 'gesture', gesture: 'nod' },
  '3': { type: 'gesture', gesture: 'laugh' },
  '4': { type: 'gesture', gesture: 'celebrate' },
  '5': { type: 'gesture', gesture: 'think' },
};

export default function AdminScreen() {
  const { controller, dispatch } = useLeviRuntime();
  const [state, setState] = useState<AnimationState>(() => controller.getState());
  const [quality] = useState(() => parseUrlOptions(window.location.search).quality);
  const [vrmUrl, setVrmUrl] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);
  const { camera, lighting, rig, fps, error } = useSceneStore();

  // Atualiza o status do painel 5x por segundo (não precisa ser a cada quadro).
  useEffect(() => {
    const id = setInterval(() => setState(controller.getState()), 200);
    return () => clearInterval(id);
  }, [controller]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'd') dispatch({ type: 'demon', value: controller.demon.target > 0.5 ? 0 : 1 });
      else if (SHORTCUTS[k]) dispatch(SHORTCUTS[k]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, controller]);

  useEffect(() => () => void (blobRef.current && URL.revokeObjectURL(blobRef.current)), []);

  const settings = (patch: Partial<AnimationSettings>) => {
    dispatch({ type: 'settings', patch });
    setState(controller.getState());
  };

  const onVrmFile = (file: File | undefined) => {
    if (!file) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = URL.createObjectURL(file);
    setVrmUrl(blobRef.current);
  };

  const s = state.settings;
  const demonOn = state.demonTarget > 0.5;

  return (
    <div className="admin">
      <div className="preview" data-testid="preview">
        <div className="preview-hud">{fps} FPS</div>
        {rig?.isPlaceholder && <div className="badge-placeholder">MODELO PROVISÓRIO</div>}
        <AvatarStage controller={controller} vrmUrl={vrmUrl} quality={quality} />
      </div>

      <div className="controls">
        <section className="section">
          <h2>Status</h2>
          <dl className="stat">
            <dt>Modelo</dt>
            <dd>
              {rig?.label ?? '…'}{' '}
              {rig && (rig.isPlaceholder ? <span className="tag warn">provisório</span> : <span className="tag ok">final</span>)}
            </dd>
            <dt>Emoção</dt>
            <dd data-testid="status-emotion">{EMOTION_LABELS[state.emotion]}</dd>
            <dt>Gesto</dt>
            <dd data-testid="status-gesture">{state.gesture ? GESTURE_LABELS[state.gesture] : '—'}</dd>
            <dt>Forma demoníaca</dt>
            <dd>{Math.round(state.demon * 100)}%</dd>
            <dt>Piscadas</dt>
            <dd data-testid="status-blinks">{state.blinkCount}</dd>
            <dt>Desempenho</dt>
            <dd>{fps} FPS</dd>
          </dl>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="section">
          <h2>Emoções</h2>
          <div className="row">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                className={`btn ${state.emotion === e ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'emotion', emotion: e, intensity: state.emotionIntensity })}
              >
                {EMOTION_LABELS[e]}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="intensity">Intensidade</label>
            <input
              id="intensity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.emotionIntensity}
              onChange={(ev) => dispatch({ type: 'emotion', emotion: state.emotion, intensity: +ev.target.value })}
            />
            <output>{Math.round(state.emotionIntensity * 100)}%</output>
          </div>
        </section>

        <section className="section">
          <h2>Gestos</h2>
          <div className="row">
            {GESTURES.map((g) => (
              <button
                key={g}
                data-testid={`gesture-${g}`}
                className={`btn ${state.gesture === g ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'gesture', gesture: g })}
              >
                {GESTURE_LABELS[g]}
              </button>
            ))}
          </div>
          <p className="hint">
            Atalhos: <kbd>1</kbd> acenar <kbd>2</kbd> concordar <kbd>3</kbd> rir <kbd>4</kbd> comemorar <kbd>5</kbd> pensar{' '}
            <kbd>B</kbd> piscar <kbd>D</kbd> demônio
          </p>
        </section>

        <section className="section">
          <h2>Transformação demoníaca</h2>
          <div className="row">
            <button
              data-testid="demon-toggle"
              className={`btn danger ${demonOn ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'demon', value: demonOn ? 0 : 1 })}
            >
              {demonOn ? '😈 Voltar à forma humana' : '😈 Transformar'}
            </button>
          </div>
          <div className="field">
            <label htmlFor="demon">Nível</label>
            <input
              id="demon"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.demonTarget}
              onChange={(ev) => dispatch({ type: 'demon', value: +ev.target.value })}
            />
            <output>{Math.round(state.demonTarget * 100)}%</output>
          </div>
        </section>

        <section className="section">
          <h2>Movimentos naturais</h2>
          <label className="check">
            <input type="checkbox" checked={s.autoBlink} onChange={(ev) => settings({ autoBlink: ev.target.checked })} />
            Piscadas automáticas
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => dispatch({ type: 'blink' })}>
              Piscar agora
            </button>
          </label>
          <div className="field">
            <label htmlFor="breath">Respiração</label>
            <input id="breath" type="range" min={0} max={3} step={0.1} value={s.breathingIntensity} onChange={(ev) => settings({ breathingIntensity: +ev.target.value })} />
            <output>{s.breathingIntensity.toFixed(1)}×</output>
          </div>
          <div className="field">
            <label htmlFor="rate">Ritmo (resp/min)</label>
            <input id="rate" type="range" min={4} max={40} step={1} value={s.breathingRate} onChange={(ev) => settings({ breathingRate: +ev.target.value })} />
            <output>{s.breathingRate}</output>
          </div>
          <div className="field">
            <label htmlFor="head">Mov. de cabeça</label>
            <input id="head" type="range" min={0} max={3} step={0.1} value={s.headMotion} onChange={(ev) => settings({ headMotion: +ev.target.value })} />
            <output>{s.headMotion.toFixed(1)}×</output>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className={`btn ${s.lookMode === 'idle' ? 'active' : ''}`} onClick={() => settings({ lookMode: 'idle' })}>
              Olhar natural
            </button>
            <button className={`btn ${s.lookMode === 'camera' ? 'active' : ''}`} onClick={() => settings({ lookMode: 'camera' })}>
              Olhar para a câmera
            </button>
          </div>
        </section>

        <section className="section">
          <h2>Câmera</h2>
          <div className="row">
            {CAMERA_PRESETS.map((c) => (
              <button key={c} className={`btn ${camera === c ? 'active' : ''}`} onClick={() => dispatch({ type: 'camera', preset: c })}>
                {CAMERA_LABELS[c]}
              </button>
            ))}
          </div>
          <h2 style={{ marginTop: 14 }}>Iluminação</h2>
          <div className="row">
            {LIGHTING_PRESETS.map((l) => (
              <button key={l} className={`btn ${lighting === l ? 'active' : ''}`} onClick={() => dispatch({ type: 'lighting', preset: l })}>
                {LIGHTING_DEFS[l].label}
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Modelo 3D</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            O Levi atual é um <b>modelo provisório</b> feito em código. Para testar um VRM (com licença adequada), carregue-o
            aqui — ele continua marcado como provisório até ser aprovado como personagem final.
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <label className="btn">
              Carregar .vrm…
              <input type="file" accept=".vrm" hidden onChange={(ev) => onVrmFile(ev.target.files?.[0])} />
            </label>
            {vrmUrl && (
              <button className="btn" onClick={() => setVrmUrl(null)}>
                Voltar ao provisório
              </button>
            )}
          </div>
        </section>

        <section className="section">
          <h2>Visualizador / OBS</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Abra o <a href="/viewer" target="_blank" rel="noreferrer">visualizador</a> em outra aba deste navegador: os comandos
            daqui são espelhados nele. Para OBS use <code>/viewer?transparent=1&amp;camera=busto</code> (1080×1920).
            <br />A integração de controle direto com o OBS chega na etapa do OBS.
          </p>
        </section>
      </div>
    </div>
  );
}
