import type { AnimationController } from '@/core/animation/AnimationController';
import { buildTimeline, parseScript, sampleTimeline, timelineDuration, timeOfChar, type ScriptPart, type Segment } from '@/core/voice/visemes';

/**
 * Faz o Levi falar um roteiro em português:
 *  - aplica emoção/gesto de cada trecho (etiquetas [feliz], [provocador]…);
 *  - toca a voz do navegador (Web Speech API, voz pt-BR do sistema) quando `withAudio`;
 *  - move a boca pela linha do tempo de visemas, realinhando a cada palavra anunciada
 *    pelo motor de voz (evento "boundary").
 * Sem voz disponível (ou `withAudio` falso), anima a boca só pela linha do tempo.
 *
 * É a ponte provisória até a etapa 2 (voz brasileira dedicada + análise do áudio).
 */
export class Speaker {
  private parts: ScriptPart[] = [];
  private idx = -1;
  private tl: Segment[] = [];
  private t0 = 0;
  private raf = 0;
  private utter: SpeechSynthesisUtterance | null = null;
  private waitingStart = false;
  speaking = false;

  constructor(
    private controller: AnimationController,
    private opts: { withAudio: boolean; rate?: number; onState?: (s: { speaking: boolean; text: string }) => void },
  ) {}

  static voices(): SpeechSynthesisVoice[] {
    if (typeof speechSynthesis === 'undefined') return [];
    return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('pt'));
  }

  /** Prefere voz masculina pt-BR quando o sistema informar (nomes variam por sistema). */
  static pickVoice(): SpeechSynthesisVoice | null {
    const list = Speaker.voices();
    const br = list.filter((v) => v.lang.toLowerCase() === 'pt-br' || v.lang.toLowerCase() === 'pt_br');
    const pool = br.length ? br : list;
    const male = pool.find((v) => /daniel|antonio|ant[oô]nio|male|masculin|humberto|fabio|f[aá]bio/i.test(v.name));
    return male ?? pool[0] ?? null;
  }

  say(script: string) {
    this.stop();
    this.parts = parseScript(script.slice(0, 600));
    this.idx = -1;
    this.speaking = this.parts.length > 0;
    this.next();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    if (typeof speechSynthesis !== 'undefined' && this.utter) speechSynthesis.cancel();
    this.utter = null;
    this.tl = [];
    this.speaking = false;
    this.controller.setVisemes({});
    this.opts.onState?.({ speaking: false, text: '' });
  }

  private next() {
    this.idx++;
    const part = this.parts[this.idx];
    if (!part) {
      this.stop();
      return;
    }
    if (part.emotion) this.controller.setEmotion(part.emotion);
    if (part.gesture) this.controller.playGesture(part.gesture);
    const rate = this.opts.rate ?? 1.05;
    this.tl = buildTimeline(part.text, rate);
    this.t0 = performance.now() / 1000;
    this.opts.onState?.({ speaking: true, text: part.text });

    const canSpeak = this.opts.withAudio && typeof speechSynthesis !== 'undefined' && Speaker.voices().length > 0;
    if (!canSpeak) {
      this.utter = null;
      this.waitingStart = false;
      return;
    }
    const u = new SpeechSynthesisUtterance(part.text);
    u.lang = 'pt-BR';
    u.rate = rate;
    u.pitch = 1.05;
    const v = Speaker.pickVoice();
    if (v) u.voice = v;
    // A boca só começa quando o áudio começa de verdade.
    this.waitingStart = true;
    u.onstart = () => {
      this.waitingStart = false;
      this.t0 = performance.now() / 1000;
    };
    u.onboundary = (ev) => {
      const t = timeOfChar(this.tl, ev.charIndex);
      if (t !== null) this.t0 = performance.now() / 1000 - t;
    };
    u.onend = () => {
      if (this.utter === u) this.next();
    };
    u.onerror = () => {
      if (this.utter === u) {
        this.utter = null;
        this.waitingStart = false;
      }
    };
    this.utter = u;
    speechSynthesis.speak(u);
  }

  private tick() {
    if (!this.speaking) return;
    if (this.waitingStart) {
      this.controller.setVisemes({});
      return;
    }
    const t = performance.now() / 1000 - this.t0;
    this.controller.setVisemes(sampleTimeline(this.tl, t));
    // Sem áudio, avança pelo tempo da própria linha do tempo (+ pausa curta entre trechos).
    if (!this.utter && t > timelineDuration(this.tl) + 0.25) this.next();
  }
}
