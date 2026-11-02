import { describe, expect, it } from 'vitest';
import { ClipQueue, parseClipManifest, type ClipDef } from '../clips/clips';
import { parseCommand } from '../control/commands';
import { FX_DEFS, FX_PRESET_DEFS, FX_PRESETS, FxTimeline } from '../fx/effects';
import { DEFAULT_REACTIONS, describeEvent, giftTier, reactTo, type LiveEvent } from '../reactions/rules';

const clip = (id: string, extra: Partial<ClipDef> = {}): ClipDef => ({
  id,
  title: id,
  src: `/clips/${id}.mp4`,
  priority: 'normal',
  cooldown: 10,
  isPlaceholder: true,
  ...extra,
});

describe('FxTimeline', () => {
  it('efeito sobe, chega ao máximo e some depois da duração', () => {
    const fx = new FxTimeline();
    fx.trigger('lightning', 0);
    const d = FX_DEFS.lightning.duration;
    expect(fx.sample(0).lightning.value).toBe(0);
    expect(fx.sample(d / 2).lightning.value).toBeCloseTo(1);
    expect(fx.sample(d + 0.01).lightning.value).toBe(0);
    expect(fx.size).toBe(0); // instância expirada é descartada
  });

  it('respeita a intensidade e não afeta outros efeitos', () => {
    const fx = new FxTimeline();
    fx.trigger('speedLines', 0, 0.4);
    const s = fx.sample(FX_DEFS.speedLines.duration / 2);
    expect(s.speedLines.value).toBeCloseTo(0.4);
    expect(s.cosmos.value).toBe(0);
  });

  it('presets agendam etapas com atraso', () => {
    const fx = new FxTimeline();
    fx.triggerPreset('dominio', 0);
    expect(fx.sample(0.5).cosmos.value).toBe(0); // cosmos só entra em 1.0s
    expect(fx.sample(0.5).speedLines.value).toBeGreaterThan(0);
    expect(fx.sample(3).cosmos.value).toBeGreaterThan(0.9);
  });

  it('todos os presets disparam algo', () => {
    for (const p of FX_PRESETS) {
      const fx = new FxTimeline();
      fx.triggerPreset(p, 0);
      const peak = Math.max(...[0.1, 0.3, 0.6, 1.2, 2].flatMap((t) => Object.values(fx.sample(t)).map((v) => v.value)));
      expect(peak, p).toBeGreaterThan(0.3);
      expect(FX_PRESET_DEFS[p].label.length).toBeGreaterThan(0);
    }
  });

  it('redisparar o mesmo efeito não acumula instâncias', () => {
    const fx = new FxTimeline();
    for (let i = 0; i < 50; i++) fx.trigger('flash', i * 0.01);
    expect(fx.size).toBe(1);
  });
});

describe('parseClipManifest', () => {
  it('aceita clipes válidos com padrões seguros', () => {
    const { clips, errors } = parseClipManifest({ clips: [{ id: 'entrada', src: '/clips/entrada.mp4' }] });
    expect(errors).toEqual([]);
    expect(clips[0]).toMatchObject({ id: 'entrada', title: 'entrada', priority: 'normal', cooldown: 30, isPlaceholder: true });
  });

  it('descarta itens inválidos explicando o motivo', () => {
    const { clips, errors } = parseClipManifest({
      clips: [
        { id: 'ok', src: '/clips/ok.webm', introFx: 'dominio', isPlaceholder: false },
        { id: 'ok', src: '/clips/ok2.mp4' },
        { id: 'fora', src: 'https://site.com/x.mp4' },
        { id: 'subindo', src: '/clips/../segredo.mp4' },
        { id: 'Maiusculo', src: '/clips/a.mp4' },
        { id: 'exe', src: '/clips/virus.exe' },
      ],
    });
    expect(clips.map((c) => c.id)).toEqual(['ok']);
    expect(clips[0]).toMatchObject({ introFx: 'dominio', isPlaceholder: false });
    expect(errors).toHaveLength(5);
  });

  it('manifesto mal formado não quebra', () => {
    expect(parseClipManifest(null).clips).toEqual([]);
    expect(parseClipManifest({ clips: 'x' }).errors).toHaveLength(1);
  });
});

describe('ClipQueue', () => {
  it('toca na hora se estiver livre e enfileira os próximos', () => {
    const q = new ClipQueue([clip('a'), clip('b')]);
    expect(q.enqueue('a', 0)).toBe('tocando');
    expect(q.enqueue('b', 1)).toBe('na-fila');
    expect(q.current?.clip.id).toBe('a');
    expect(q.finish(5)?.clip.id).toBe('b');
    expect(q.finish(9)).toBeNull();
  });

  it('prioridade alta fura a fila dos normais, mas não interrompe o atual', () => {
    const q = new ClipQueue([clip('a'), clip('b'), clip('c'), clip('vip', { priority: 'alta' })]);
    q.enqueue('a', 0);
    q.enqueue('b', 0);
    q.enqueue('c', 0);
    q.enqueue('vip', 0);
    expect(q.current?.clip.id).toBe('a');
    expect(q.pending.map((p) => p.clip.id)).toEqual(['vip', 'b', 'c']);
  });

  it('respeita cooldown, duplicados, limite e clipes desconhecidos', () => {
    const q = new ClipQueue([clip('a', { cooldown: 20 }), clip('b'), clip('c'), clip('d')], 2);
    expect(q.enqueue('nao-existe', 0)).toBe('desconhecido');
    q.enqueue('a', 0);
    expect(q.enqueue('a', 1)).toBe('duplicado');
    q.finish(5);
    expect(q.enqueue('a', 10)).toBe('em-cooldown');
    expect(q.cooldownLeft('a', 10)).toBeCloseTo(10);
    expect(q.enqueue('a', 10, 'painel', { ignoreCooldown: true })).toBe('tocando');
    q.enqueue('b', 11);
    q.enqueue('c', 11);
    expect(q.enqueue('d', 11)).toBe('fila-cheia');
  });

  it('skip e clear', () => {
    const q = new ClipQueue([clip('a'), clip('b')]);
    q.enqueue('a', 0);
    q.enqueue('b', 0);
    expect(q.skip(1)?.clip.id).toBe('b');
    q.clear();
    expect(q.current).toBeNull();
    expect(q.pending).toHaveLength(0);
  });
});

describe('Regras de reação', () => {
  const gift = (coins: number, count = 1): LiveEvent => ({ type: 'gift', user: 'ana', gift: 'Rosa', coins, count, simulated: true });

  it('classifica presentes por valor total', () => {
    expect(giftTier(1)).toBe('pequeno');
    expect(giftTier(DEFAULT_REACTIONS.giftBig)).toBe('grande');
    expect(giftTier(DEFAULT_REACTIONS.giftLegendary)).toBe('lendario');
  });

  it('presente lendário dispara clipe de prioridade + domínio cósmico', () => {
    const cmds = reactTo(gift(500, 2));
    expect(cmds).toContainEqual({ type: 'clip', action: 'play', id: 'presente-lendario' });
    expect(cmds).toContainEqual({ type: 'fxPreset', preset: 'dominio' });
  });

  it('presente pequeno não dispara clipe (evita spam de vídeos)', () => {
    expect(reactTo(gift(1)).some((c) => c.type === 'clip')).toBe(false);
  });

  it('poucas curtidas não fazem nada', () => {
    expect(reactTo({ type: 'likes', user: 'x', count: 3, simulated: true })).toEqual([]);
  });

  it('todos os comandos gerados são válidos no protocolo', () => {
    const events: LiveEvent[] = [
      gift(1),
      gift(100),
      gift(5000),
      { type: 'follow', user: 'a', simulated: true },
      { type: 'likes', user: 'a', count: 500, simulated: true },
      { type: 'share', user: 'a', simulated: true },
    ];
    for (const ev of events) for (const cmd of reactTo(ev)) expect(parseCommand(cmd), JSON.stringify(cmd)).toEqual(cmd);
  });

  it('eventos simulados são marcados no log', () => {
    expect(describeEvent(gift(10, 3))).toBe('[SIMULADO] ana enviou 3× Rosa (30 moedas)');
    expect(describeEvent({ type: 'follow', user: 'bia', simulated: false })).toBe('bia começou a seguir');
  });
});
