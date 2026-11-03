import { createRng } from '@/core/animation/math';
import { drawZynoxEmblem } from './levi25d';
import { ribbon, shape, sharpClosed, smoothClosed, type Style } from './draw';

/**
 * Cenário "Quarto gamer ZYNOX": quarto medieval de madeira com lanternas, luz quente
 * e neon roxo. O fundo é desenhado uma vez (com desfoque de profundidade, por ser
 * renderizado em resolução baixa e ampliado) e só os brilhos são animados.
 * A cadeira e a mesa ficam no espaço do personagem (acompanham a câmera).
 */

const PURPLE = '#a35cff';

/** Desenha o fundo estático num canvas pequeno (vira desfoque ao ampliar). */
export function renderRoomBackdrop(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  // Resolução baixa = desfoque barato e natural (profundidade de campo).
  c.width = Math.max(64, Math.round(w * 0.22));
  c.height = Math.max(64, Math.round(h * 0.22));
  const ctx = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  const X = (x: number) => x * W;
  const Y = (y: number) => y * H;
  const rng = createRng(7);

  // Parede de madeira quente
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#3a1d10');
  wall.addColorStop(0.5, '#5a3018');
  wall.addColorStop(1, '#2a140b');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  // Tábuas verticais
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(20,8,2,${0.15 + rng() * 0.15})`;
    ctx.fillRect(X(i / 14), 0, Math.max(1, W * 0.006), H);
  }
  // Vigas
  ctx.fillStyle = '#24120a';
  ctx.fillRect(0, Y(0.05), W, Y(0.035));
  ctx.fillRect(X(0.33), 0, X(0.035), H * 0.72);
  ctx.fillRect(X(0.72), 0, X(0.03), H * 0.72);
  ctx.save();
  ctx.translate(X(0.06), Y(0.12));
  ctx.rotate(0.5);
  ctx.fillRect(0, 0, X(0.3), Y(0.015));
  ctx.restore();

  // Janela com luz quente (esquerda)
  const win = ctx.createLinearGradient(X(0.02), 0, X(0.2), 0);
  win.addColorStop(0, '#ffcf7a');
  win.addColorStop(1, '#ff9a3a');
  ctx.fillStyle = win;
  ctx.fillRect(X(0.03), Y(0.14), X(0.15), Y(0.2));
  ctx.fillStyle = '#2a140b';
  ctx.fillRect(X(0.1), Y(0.14), X(0.012), Y(0.2));
  ctx.fillRect(X(0.03), Y(0.235), X(0.15), Y(0.01));

  // Banner roxo com o emblema
  ctx.fillStyle = '#241433';
  ctx.beginPath();
  ctx.moveTo(X(0.22), Y(0.08));
  ctx.lineTo(X(0.32), Y(0.08));
  ctx.lineTo(X(0.32), Y(0.3));
  ctx.lineTo(X(0.27), Y(0.27));
  ctx.lineTo(X(0.22), Y(0.3));
  ctx.closePath();
  ctx.fill();
  drawZynoxEmblem(ctx, [X(0.27), Y(0.17)], W * 0.04, '#c08cff', 0, 1);

  // Prateleira com neon roxo (direita) e silhuetas genéricas
  ctx.fillStyle = '#2a140b';
  ctx.fillRect(X(0.74), Y(0.2), X(0.26), Y(0.012));
  ctx.fillRect(X(0.74), Y(0.3), X(0.26), Y(0.012));
  const neon = ctx.createLinearGradient(0, Y(0.12), 0, Y(0.36));
  neon.addColorStop(0, 'rgba(163,92,255,0)');
  neon.addColorStop(0.5, 'rgba(163,92,255,0.55)');
  neon.addColorStop(1, 'rgba(163,92,255,0)');
  ctx.fillStyle = neon;
  ctx.fillRect(X(0.72), Y(0.1), X(0.28), Y(0.28));
  for (let i = 0; i < 6; i++) {
    const x = X(0.76 + i * 0.04);
    const shelfY = i % 2 ? Y(0.2) : Y(0.3);
    ctx.fillStyle = i % 3 === 0 ? '#1a1024' : '#3a2440';
    ctx.fillRect(x, shelfY - Y(0.03 + rng() * 0.025), X(0.025), Y(0.03 + rng() * 0.02));
  }

  // Cama com almofadas escuras (fundo, esquerda)
  ctx.fillStyle = '#21142c';
  ctx.beginPath();
  ctx.ellipse(X(0.12), Y(0.43), X(0.2), Y(0.05), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a4a';
  ctx.beginPath();
  ctx.ellipse(X(0.08), Y(0.4), X(0.07), Y(0.03), -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Hera caindo do teto
  ctx.strokeStyle = 'rgba(70,110,40,0.8)';
  ctx.lineWidth = Math.max(1, W * 0.006);
  for (let i = 0; i < 4; i++) {
    const x = X(0.62 + i * 0.025);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + X(0.02), Y(0.08), x - X(0.01), Y(0.14 + rng() * 0.06));
    ctx.stroke();
  }

  // Vinheta para concentrar a atenção no centro
  const v = ctx.createRadialGradient(X(0.5), Y(0.45), X(0.2), X(0.5), Y(0.5), X(0.9));
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,2,12,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

/** Brilhos animados por cima do fundo (lanternas tremulando e bokeh). */
export function drawRoomGlow(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lanterns: [number, number, number][] = [
    [0.4, 0.2, 0],
    [0.56, 0.24, 1.7],
    [0.06, 0.06, 3.1],
  ];
  for (const [x, y, ph] of lanterns) {
    const f = 0.82 + 0.1 * Math.sin(time * 7 + ph) + 0.08 * Math.sin(time * 13.3 + ph * 2);
    const r = W * 0.14;
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
    g.addColorStop(0, `rgba(255,190,90,${0.55 * f})`);
    g.addColorStop(0.25, `rgba(255,140,40,${0.22 * f})`);
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x * W - r, y * H - r, r * 2, r * 2);
  }
  // Bokeh: círculos de luz desfocados
  const rng = createRng(3);
  for (let i = 0; i < 16; i++) {
    const x = rng() * W;
    const y = rng() * H * 0.7;
    const r = W * (0.012 + rng() * 0.03);
    const purple = rng() < 0.4;
    const a = (0.08 + rng() * 0.1) * (0.8 + 0.2 * Math.sin(time * (0.5 + rng()) + i));
    ctx.fillStyle = purple ? `rgba(163,92,255,${a})` : `rgba(255,190,110,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Cadeira gamer atrás do personagem (espaço de desenho do personagem). */
export function drawGamingChair(ctx: CanvasRenderingContext2D, st: Style, time: number) {
  const back = smoothClosed([[300, 560], [700, 560], [735, 680], [720, 1200], [280, 1200], [265, 680]], 0.55);
  shape(ctx, back, { base: '#1c1824', shade: '#100d16', line: '#050407' }, st, { shadeK: 2 });
  // Faixas roxas laterais
  for (const s of [-1, 1]) {
    const band = ribbon([[500 + s * 175, 600], [500 + s * 195, 900], [500 + s * 190, 1180]], [26, 26, 26], false);
    ctx.fillStyle = '#4a2a7a';
    ctx.fill(band);
  }
  // Emblema no encosto (fica visível acima do ombro)
  drawZynoxEmblem(ctx, [500, 610], 52, PURPLE, time, 0.8);
}

/** Mesa, teclado, mouse, microfone e monitor (na frente do personagem). */
export function drawDesk(ctx: CanvasRenderingContext2D, st: Style, time: number, talking: number) {
  // Tampo de madeira em perspectiva
  const top = sharpClosed([[-400, 1230], [1400, 1230], [1500, 1420], [-500, 1420]]);
  shape(ctx, top, { base: '#6b3e1f', shade: '#4a2812', line: '#1e0e05' }, st, { shadeK: 2 });
  ctx.fillStyle = '#2e170a';
  ctx.fillRect(-600, 1415, 2200, 1400);
  // veios da madeira
  ctx.strokeStyle = 'rgba(30,14,5,0.4)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-400, 1260 + i * 28);
    ctx.lineTo(1400, 1262 + i * 28);
    ctx.stroke();
  }

  // Teclado com teclas roxas brilhando (pulsam quando ele fala)
  const kb = sharpClosed([[300, 1268], [720, 1268], [740, 1362], [282, 1362]]);
  shape(ctx, kb, { base: '#16131c', shade: '#0b0a10', line: '#000000' }, st);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 14; k++) {
      const x = 300 + k * 30 + r * 4;
      const y = 1278 + r * 21;
      const wave = 0.5 + 0.5 * Math.sin(time * 3 - k * 0.5 + r);
      ctx.fillStyle = `rgba(163,92,255,${0.35 + 0.35 * wave + talking * 0.2})`;
      ctx.fillRect(x, y, 22, 14);
    }
  }
  ctx.restore();

  // Mouse
  const mouse = smoothClosed([[790, 1300], [840, 1296], [850, 1350], [795, 1356]], 0.9);
  shape(ctx, mouse, { base: '#16131c', shade: '#0b0a10', line: '#000000' }, st);
  ctx.fillStyle = `rgba(163,92,255,${0.7 + 0.3 * Math.sin(time * 2)})`;
  ctx.fillRect(812, 1310, 6, 16);

  // Monitor (lado esquerdo da tela) com o emblema
  const mon = sharpClosed([[-170, 820], [250, 860], [250, 1250], [-170, 1290]]);
  shape(ctx, mon, { base: '#0d0b12', shade: '#07060a', line: '#000000' }, st);
  const scr = sharpClosed([[-150, 845], [228, 880], [228, 1228], [-150, 1262]]);
  const sg = ctx.createLinearGradient(0, 860, 0, 1250);
  sg.addColorStop(0, '#2a1450');
  sg.addColorStop(1, '#120826');
  ctx.fillStyle = sg;
  ctx.fill(scr);
  drawZynoxEmblem(ctx, [40, 1040], 90, '#c08cff', time, 1.2);

  // Caneca com o emblema
  const mug = sharpClosed([[860, 1180], [960, 1180], [955, 1310], [866, 1310]]);
  shape(ctx, mug, { base: '#16131c', shade: '#0b0a10', line: '#000000' }, st);
  ctx.strokeStyle = '#16131c';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(966, 1245, 26, -1.2, 1.2);
  ctx.stroke();
  drawZynoxEmblem(ctx, [910, 1245], 26, PURPLE, time, 0.6);

  // Microfone de estúdio no braço articulado, na frente do peito (como numa live)
  const arm = ribbon([[1150, 700], [900, 830], [700, 905]], [18, 18, 16], false);
  shape(ctx, arm, { base: '#1a1720', shade: '#0b0a10', line: '#000000' }, st);
  const micBody = smoothClosed([[600, 900], [680, 900], [690, 1120], [598, 1120]], 0.7);
  shape(ctx, micBody, { base: '#1d1a24', shade: '#0d0b12', line: '#000000' }, st);
  // grade do microfone
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(608, 920 + i * 14);
    ctx.lineTo(680, 920 + i * 14);
    ctx.stroke();
  }
  // Anel de LED roxo (acende quando ele fala)
  ctx.save();
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 18 + talking * 20;
  ctx.fillStyle = `rgba(190,130,255,${0.55 + 0.45 * talking})`;
  ctx.fillRect(604, 1040, 82, 10);
  ctx.restore();
}
