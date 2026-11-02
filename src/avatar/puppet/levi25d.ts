import * as THREE from 'three';
import type { Pose } from '@/core/animation/types';
import type { Live2DParams } from '@/core/params/live2dParams';
import { SpringChain } from '@/core/physics/springChain';
import {
  add,
  cel,
  dir,
  len,
  lerpV,
  mixHex,
  mul,
  norm,
  outline,
  perp,
  ribbon,
  shape,
  sharpClosed,
  smoothClosed,
  smoothOpen,
  sub,
  type Style,
  type V,
} from './draw';

/**
 * LEVI 2.5D — personagem ORIGINAL desenhado em vetor e animado em tempo real.
 *
 * Técnica no estilo Live2D: cada parte do rosto fica numa "profundidade" e desliza
 * quando a cabeça gira (paralaxe); cabelo, capa e abas do casaco têm física de mola;
 * os braços usam cinemática 3D projetada na tela (os mesmos gestos do modelo 3D).
 *
 * É uma DEMONSTRAÇÃO feita em código. A qualidade final de anime profissional
 * depende de uma ilustração + rigging (ver docs/VISUAL.md).
 *
 * Espaço de desenho: 1000 × 2600 unidades, y para baixo, personagem de frente.
 * O lado ESQUERDO do personagem aparece à DIREITA da tela.
 */

export const PALETTE = {
  skin: '#ffe6d5',
  skinShade: '#f2b9a4',
  skinLine: '#9a5a48',
  blush: '#ff8f9a',
  hair: '#f6cf5a',
  hairShade: '#d9962c',
  hairLine: '#7d4a10',
  hairLight: '#fff3b8',
  hairDemonTip: '#d1163a',
  irisTop: '#5a2a06',
  irisMid: '#e0901c',
  irisBottom: '#ffe08a',
  irisDemonTop: '#3a0008',
  irisDemonMid: '#ff2448',
  irisDemonBottom: '#ffb0b8',
  lash: '#2a160c',
  coat: '#262a4a',
  coatShade: '#171a33',
  coatLine: '#0b0c1a',
  lining: '#a3172f',
  liningShade: '#6e0c1f',
  gold: '#efc15a',
  goldShade: '#b07a22',
  goldLine: '#5c3a08',
  shirt: '#1a1726',
  pants: '#1f1c2e',
  pantsShade: '#131120',
  leather: '#5b3820',
  leatherShade: '#3a2212',
  glove: '#24202e',
  gloveShade: '#15121c',
  gem: '#ff2a4a',
  mouth: '#7a1e2c',
  tongue: '#ff7f8e',
  horn: '#2a1622',
  hornShade: '#14080f',
  hornGlow: '#ff3355',
} as const;

const DEG = Math.PI / 180;
/** 1 metro em unidades de desenho (personagem ~1,78 m ≈ 2350 unidades). */
const M = 1320;

type HandShape = 'relaxed' | 'open' | 'point';

interface Strand {
  root: V;
  tip: V;
  width: number;
  depth: number;
  bend: number;
  chain: SpringChain;
  shadeSide: 1 | -1;
}

function strand(root: V, tip: V, width: number, depth: number, bend = 0, segs = 3, stiffness = 70): Strand {
  return {
    root,
    tip,
    width,
    depth,
    bend,
    chain: new SpringChain({ segments: segs, stiffness, damping: 6, inertia: 1, tipSoftness: 0.45 }),
    shadeSide: tip[0] > root[0] ? 1 : -1,
  };
}

export interface PuppetFrame {
  pose: Pose;
  params: Live2DParams;
  dt: number;
  time: number;
  hand: { left: HandShape; right: HandShape };
}

export class Levi25D {
  // Cabelo: mechas curvas e assimétricas, varridas para a esquerda da tela (identidade do Levi).
  // strand(raiz, ponta, largura, profundidade, curvatura, segmentos, rigidez)
  private hair = {
    tufts: [
      strand([-70, -200], [-205, -300], 92, 0.1, -0.55, 3, 50),
      strand([-10, -215], [-95, -360], 98, 0.1, -0.5, 3, 50),
      strand([55, -210], [60, -350], 88, 0.1, -0.45, 3, 50),
      strand([110, -185], [215, -285], 78, 0.12, -0.35, 3, 55),
      strand([-125, -160], [-268, -170], 66, 0.15, -0.4, 3, 60),
      strand([145, -125], [255, -150], 56, 0.18, -0.3, 3, 60),
    ],
    sideLocks: [strand([-140, -70], [-150, 215], 42, 0.45, 0.35, 4, 40), strand([142, -70], [152, 200], 40, 0.45, -0.3, 4, 40)],
    bangs: [
      strand([-138, -110], [-162, 52], 40, 0.8, 0.3, 3, 75),
      strand([-95, -150], [-150, -4], 52, 0.84, 0.45, 3, 80),
      strand([-40, -170], [-112, -24], 50, 0.88, 0.5, 3, 80),
      strand([20, -175], [-46, 22], 54, 0.95, 0.42, 3, 80),
      strand([70, -165], [40, -26], 46, 0.9, 0.3, 3, 85),
      strand([112, -142], [108, -18], 44, 0.86, 0.2, 3, 80),
      strand([142, -108], [156, 48], 36, 0.8, -0.2, 3, 75),
    ],
    ahoge: strand([30, -228], [96, -318], 18, 0.1, 1.1, 3, 30),
  };
  private cape = new SpringChain({ segments: 3, stiffness: 28, damping: 4, inertia: 1.4, tipSoftness: 0.5 });
  private tails = [new SpringChain({ segments: 2, stiffness: 35, damping: 5, inertia: 1.2 }), new SpringChain({ segments: 2, stiffness: 35, damping: 5, inertia: 1.2 })];

  private prevHead: V | null = null;
  private prevHeadVel: V = [0, 0];
  private prevRoll = 0;
  private prevBody: V | null = null;
  private prevBodyVel: V = [0, 0];

  /** Lighting/demon tint is applied by the caller via composite operations. */
  draw(ctx: CanvasRenderingContext2D, f: PuppetFrame, st: Style) {
    const { pose, params: P, dt, time } = f;
    const b = pose.bones;
    const demon = P.ParamDemon;
    const jump = -pose.hipsOffsetY * M;

    // ---------- Corpo: inclinação e respiração ----------
    const bodyRoll = P.ParamBodyAngleZ * DEG;
    const bodyYaw = P.ParamBodyAngleX * DEG;
    const breath = P.ParamBreath;
    const hipPivot: V = [500, 1150 + jump];
    const toBody = (p: V): V => {
      // gira em volta do quadril + respiração estica o peito para cima
      const q: V = [p[0], p[1] + jump];
      const lift = p[1] < 1100 ? breath * 5 * ((1100 - p[1]) / 450) : 0;
      const r = rot(sub([q[0], q[1] - lift], hipPivot), -bodyRoll);
      return add(hipPivot, [r[0] + Math.sin(bodyYaw) * 40 * Math.max(0, (1150 - p[1]) / 500), r[1]]);
    };

    // Pescoço / cabeça seguem o corpo.
    const neckTop = toBody([500, 600]);
    const headRoll = P.ParamAngleZ * DEG + bodyRoll * 0.6;
    const yaw = P.ParamAngleX * DEG;
    const pitch = P.ParamAngleY * DEG;
    const headCenter = add(neckTop, rot([0, -180], -headRoll));
    const par = (depth: number): V => [Math.sin(yaw) * depth * 48, -Math.sin(pitch) * depth * 38];

    // ---------- Física secundária ----------
    const h = Math.max(dt, 1 / 240);
    const headVel: V = this.prevHead ? mul(sub(headCenter, this.prevHead), 1 / h) : [0, 0];
    const headAcc: V = mul(sub(headVel, this.prevHeadVel), 1 / h);
    const rollVel = (headRoll - this.prevRoll) / h;
    const yawPush = Math.sin(yaw) * 60;
    this.prevHead = headCenter;
    this.prevHeadVel = headVel;
    this.prevRoll = headRoll;
    const wind = demon > 0.05 ? (Math.sin(time * 9) + Math.sin(time * 13.7)) * 6 * demon : Math.sin(time * 0.9) * 0.6;
    const clampAcc = (a: number) => Math.max(-4000, Math.min(4000, a));
    const allHair = [...this.hair.tufts, ...this.hair.sideLocks, ...this.hair.bangs, this.hair.ahoge];
    for (const s of allHair) s.chain.step(dt, clampAcc(headAcc[0] + yawPush * s.depth), rollVel, wind * (0.5 + s.depth));
    const bodyPt = toBody([500, 900]);
    const bodyVel: V = this.prevBody ? mul(sub(bodyPt, this.prevBody), 1 / h) : [0, 0];
    const bodyAcc = mul(sub(bodyVel, this.prevBodyVel), 1 / h);
    this.prevBody = bodyPt;
    this.prevBodyVel = bodyVel;
    this.cape.step(dt, clampAcc(bodyAcc[0] - bodyAcc[1] * 0.3), 0, wind * 0.6 + Math.sin(time * 0.7) * 0.8);
    for (const t of this.tails) t.step(dt, clampAcc(bodyAcc[0]), 0, wind * 0.4);

    // ---------- Braços (cinemática 3D projetada) ----------
    const arms = {
      left: armChain(pose, 'left', toBody([668, 702]), f.hand.left),
      right: armChain(pose, 'right', toBody([332, 702]), f.hand.right),
    };

    // ================= DESENHO (de trás para frente) =================
    if (demon > 0.02) this.drawAura(ctx, headCenter, demon, time);
    this.drawCape(ctx, toBody, st, demon);
    this.drawBackHair(ctx, headCenter, headRoll, par, st, demon);
    for (const side of ['left', 'right'] as const) if (!arms[side].front) drawArm(ctx, arms[side], st, side);
    this.drawLegs(ctx, jump, st);
    this.drawTails(ctx, toBody, st);
    this.drawTorso(ctx, toBody, bodyYaw, st, demon, time);
    this.drawHead(ctx, f, headCenter, headRoll, par, yaw, st);
    for (const side of ['left', 'right'] as const) if (arms[side].front) drawArm(ctx, arms[side], st, side);
  }

  // -------------------------------------------------------------------------------------------

  private drawAura(ctx: CanvasRenderingContext2D, head: V, demon: number, time: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const c: V = [500, head[1] + 600];
    const g = ctx.createRadialGradient(c[0], c[1], 50, c[0], c[1], 900);
    g.addColorStop(0, `rgba(255,40,80,${0.35 * demon})`);
    g.addColorStop(0.5, `rgba(150,0,60,${0.18 * demon})`);
    g.addColorStop(1, 'rgba(60,0,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(c[0] - 900, c[1] - 900, 1800, 1800);
    // Chamas: línguas que sobem atrás do corpo.
    for (let i = 0; i < 9; i++) {
      const x = 260 + i * 60 + Math.sin(time * 3 + i) * 15;
      const hgt = 380 + Math.sin(time * 5 + i * 1.7) * 120;
      const base = head[1] + 420 + Math.abs(i - 4) * 40;
      const p = sharpClosed([
        [x - 45, base],
        [x + Math.sin(time * 6 + i) * 30, base - hgt],
        [x + 45, base],
      ]);
      ctx.fillStyle = `rgba(255,60,90,${0.18 * demon})`;
      ctx.fill(p);
    }
    ctx.restore();
  }

  private drawCape(ctx: CanvasRenderingContext2D, toBody: (p: V) => V, st: Style, demon: number) {
    // Meia-capa sobre o ombro DIREITO do personagem (esquerda da tela), caindo atrás do braço.
    const root = toBody([318, 705]);
    const pts: V[] = [root];
    let a = Math.PI / 2 + 0.12;
    const seg = 290;
    for (let i = 0; i < 3; i++) {
      a += this.cape.angles[i]! * 0.8;
      pts.push(add(pts[i]!, mul([Math.cos(a), Math.sin(a)], seg)));
    }
    const widths = [150, 230, 270, 250];
    const outer: V[] = [];
    const inner: V[] = [];
    pts.forEach((p, i) => {
      const w = widths[i]!;
      outer.push(add(p, [-w * 0.55, 0]));
      inner.push(add(p, [w * 0.45, 0]));
    });
    // borda inferior recortada em pontas
    const hem: V[] = [];
    const last = pts[3]!;
    for (let i = 0; i <= 4; i++) {
      const x = lerpV(outer[3]!, inner[3]!, i / 4);
      hem.push(add(x, [0, i % 2 ? -50 : 20]));
    }
    const path = smoothClosed([...outer, ...hem.slice(1, -1), ...inner.reverse()], 0.85);
    void last;
    shape(ctx, path, { base: mixHex(PALETTE.lining, '#ff2244', demon * 0.3), shade: PALETTE.liningShade, line: PALETTE.coatLine }, st, { shadeK: 2 });
  }

  private drawBackHair(ctx: CanvasRenderingContext2D, head: V, roll: number, par: (d: number) => V, st: Style, demon: number) {
    ctx.save();
    ctx.translate(head[0], head[1]);
    ctx.rotate(roll);
    const o = par(-0.6);
    ctx.translate(o[0], o[1]);
    const pts: V[] = [
      [-150, -90], [-185, 10], [-212, 120], [-160, 92], [-168, 175], [-118, 130], [-104, 200],
      [-55, 150], [0, 190], [55, 150], [104, 200], [118, 130], [168, 175], [160, 92], [212, 120],
      [185, 10], [150, -90], [0, -240],
    ];
    const path = sharpClosed(pts);
    const base = mixHex(PALETTE.hairShade, '#8a1020', demon * 0.4);
    shape(ctx, path, { base, shade: mixHex(base, '#000000', 0.25), line: PALETTE.hairLine }, st);
    ctx.restore();
  }

  private drawLegs(ctx: CanvasRenderingContext2D, jump: number, st: Style) {
    for (const s of [-1, 1]) {
      const x = 500 + s * 62;
      const leg = smoothClosed([
        [x - 60, 1120 + jump],
        [x + 56, 1120 + jump],
        [x + 50, 1600 + jump],
        [x + 44, 1950 + jump],
        [x - 44, 1950 + jump],
        [x - 52, 1600 + jump],
      ], 0.6);
      shape(ctx, leg, { base: PALETTE.pants, shade: PALETTE.pantsShade, line: PALETTE.coatLine }, st, { shadeK: 1.6 });
      // Bota de cano alto, um pouco mais larga em cima, com bico arredondado para fora
      const boot = smoothClosed([
        [x - 56, 1860 + jump],
        [x + 54, 1860 + jump],
        [x + 46, 2350 + jump],
        [x + 52 + s * 30, 2430 + jump],
        [x + 38 + s * 46, 2490 + jump],
        [x - 50 + s * 6, 2496 + jump],
        [x - 54, 2420 + jump],
        [x - 50, 2350 + jump],
      ], 0.55);
      shape(ctx, boot, { base: PALETTE.leather, shade: PALETTE.leatherShade, line: '#1e1008' }, st, { shadeK: 1.6 });
      const cuff = smoothClosed([
        [x - 64, 1846 + jump],
        [x + 62, 1846 + jump],
        [x + 58, 1906 + jump],
        [x - 60, 1906 + jump],
      ], 0.4);
      shape(ctx, cuff, { base: PALETTE.gold, shade: PALETTE.goldShade, line: PALETTE.goldLine }, st);
      // Sola
      ctx.strokeStyle = '#1e1008';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 48 + s * 6, 2494 + jump);
      ctx.lineTo(x + 36 + s * 46, 2488 + jump);
      ctx.stroke();
    }
  }

  private drawTails(ctx: CanvasRenderingContext2D, toBody: (p: V) => V, st: Style) {
    // Abas longas do sobretudo, abertas na frente.
    [-1, 1].forEach((s, i) => {
      const chain = this.tails[i]!;
      const top = toBody([500 + s * 85, 1100]);
      const outerTop = toBody([500 + s * 150, 1100]);
      const sw = chain.angles[0]! * 0.8 + chain.angles[1]! * 0.4;
      const bottomInner = add(top, rot([s * 10, 690], sw));
      const bottomOuter = add(outerTop, rot([s * 75, 670], sw));
      const path = smoothClosed([top, outerTop, lerpV(outerTop, bottomOuter, 0.5), bottomOuter, lerpV(bottomOuter, bottomInner, 0.5), bottomInner], 0.6);
      shape(ctx, path, { base: PALETTE.coat, shade: PALETTE.coatShade, line: PALETTE.coatLine }, st, { shadeK: 1.6 });
      // forro carmesim aparecendo na borda interna
      const lin = ribbon([top, lerpV(top, bottomInner, 0.5), bottomInner], [16, 16, 16], false);
      ctx.fillStyle = PALETTE.lining;
      ctx.fill(lin);
      // barra dourada
      const hem = smoothOpen([bottomInner, lerpV(bottomInner, bottomOuter, 0.5), bottomOuter]);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 14;
      ctx.stroke(hem);
    });
  }

  private drawTorso(ctx: CanvasRenderingContext2D, toBody: (p: V) => V, yaw: number, st: Style, demon: number, time: number) {
    const T = (pts: V[]) => pts.map(toBody);
    const shift = Math.sin(yaw) * 28;
    // Pescoço
    const neck = smoothClosed(T([[462, 560], [538, 560], [544, 690], [456, 690]]), 0.5);
    shape(ctx, neck, { base: PALETTE.skin, shade: PALETTE.skinShade, line: PALETTE.skinLine }, st, { shadeK: 2.5 });
    // Sombra do queixo no pescoço
    ctx.save();
    ctx.clip(neck);
    ctx.fillStyle = PALETTE.skinShade;
    ctx.fill(smoothClosed(T([[450, 560], [550, 560], [545, 615], [500, 630], [455, 615]]), 0.8));
    ctx.restore();

    // Sobretudo
    const coat = smoothClosed(
      T([
        [318, 690], [430, 655], [500, 668], [570, 655], [682, 690], [700, 770], [668, 880], [628, 1060],
        [650, 1150], [350, 1150], [372, 1060], [332, 880], [300, 770],
      ]),
      0.7,
    );
    shape(ctx, coat, { base: PALETTE.coat, shade: PALETTE.coatShade, line: PALETTE.coatLine }, st, { shadeK: 2 });
    // Camisa escura no decote em V
    const v = sharpClosed(T([[455 + shift, 662], [545 + shift, 662], [500 + shift, 800]]));
    ctx.fillStyle = PALETTE.shirt;
    ctx.fill(v);
    // Lapelas douradas
    for (const s of [-1, 1]) {
      const lap = smoothOpen(T([[500 + s * 52 + shift, 660], [500 + s * 26 + shift, 790], [500 + s * 40 + shift, 1060]]));
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.stroke(lap);
      ctx.strokeStyle = PALETTE.goldLine;
      ctx.lineWidth = 3;
      ctx.stroke(lap);
    }
    // Fechos dourados
    for (let i = 0; i < 3; i++) {
      const y = 860 + i * 62;
      const p = toBody([500 + shift * 0.8, y]);
      const clasp = smoothClosed([add(p, [-34, -8]), add(p, [34, -8]), add(p, [34, 8]), add(p, [-34, 8])], 0.5);
      shape(ctx, clasp, { base: PALETTE.gold, shade: PALETTE.goldShade, line: PALETTE.goldLine }, st, { lineK: 0.6 });
    }
    // Gola alta
    const collar = smoothClosed(T([[420, 690], [440, 600], [470, 590], [470, 668], [500, 700], [530, 668], [530, 590], [560, 600], [580, 690], [500, 720]]), 0.45);
    shape(ctx, collar, { base: PALETTE.coat, shade: PALETTE.coatShade, line: PALETTE.coatLine }, st);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 8;
    ctx.stroke(smoothOpen(T([[440, 604], [470, 594]])));
    ctx.stroke(smoothOpen(T([[530, 594], [560, 604]])));
    // Pingente com gema
    const g = toBody([500 + shift, 760]);
    const gem = sharpClosed([add(g, [0, -26]), add(g, [20, 0]), add(g, [0, 30]), add(g, [-20, 0])]);
    const glow = 0.5 + 0.5 * Math.sin(time * 3);
    shape(ctx, gem, { base: mixHex(PALETTE.gem, '#ffffff', 0.15 + demon * glow * 0.3), shade: '#a00a24', line: '#4a0010' }, st, { lineK: 0.7 });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(g[0] - 6, g[1] - 9, 4, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Cinto + fivela + espada
    const belt = smoothClosed(T([[360, 1065], [640, 1065], [646, 1110], [354, 1110]]), 0.3);
    shape(ctx, belt, { base: PALETTE.leather, shade: PALETTE.leatherShade, line: '#1e1008' }, st);
    const bk = toBody([500 + shift * 0.6, 1088]);
    const buckle = smoothClosed([add(bk, [-34, -26]), add(bk, [34, -26]), add(bk, [34, 26]), add(bk, [-34, 26])], 0.4);
    shape(ctx, buckle, { base: PALETTE.gold, shade: PALETTE.goldShade, line: PALETTE.goldLine }, st);
    const hiltA = toBody([605, 1020]);
    const hiltB = toBody([640, 1110]);
    const scab = ribbon([hiltB, toBody([700, 1380]), toBody([765, 1660])], [34, 30, 22], false);
    shape(ctx, scab, { base: '#3b1c2c', shade: '#22101a', line: '#10060c' }, st);
    const grip = ribbon([hiltA, hiltB], [22, 22], false);
    shape(ctx, grip, { base: PALETTE.leather, shade: PALETTE.leatherShade, line: '#1e1008' }, st);
    const gd = lerpV(hiltA, hiltB, 0.95);
    const guard = ribbon([add(gd, [-38, 12]), add(gd, [38, -12])], [16, 16], false);
    shape(ctx, guard, { base: PALETTE.gold, shade: PALETTE.goldShade, line: PALETTE.goldLine }, st);
  }

  // -------------------------------------------------------------------------------------------

  private drawHead(ctx: CanvasRenderingContext2D, f: PuppetFrame, head: V, roll: number, par: (d: number) => V, yaw: number, st: Style) {
    const P = f.params;
    const demon = P.ParamDemon;
    const turn = Math.sin(yaw);
    ctx.save();
    ctx.translate(head[0], head[1]);
    ctx.rotate(roll);

    // Orelhas (atrás do rosto) + brinco de lua crescente na orelha esquerda do personagem
    for (const s of [-1, 1]) {
      const o = par(-0.25 + 0.1 * s * turn);
      const c: V = [s * 150 + o[0] - turn * 18, 22 + o[1]];
      const ear = smoothClosed([add(c, [-14 * s, -38]), add(c, [16 * s, -30]), add(c, [20 * s, 10]), add(c, [4 * s, 40]), add(c, [-12 * s, 30])], 0.8);
      shape(ctx, ear, { base: PALETTE.skin, shade: PALETTE.skinShade, line: PALETTE.skinLine }, st);
      if (s === 1) {
        const ring = add(c, [8, 48]);
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(ring[0], ring[1], 16, -0.3, Math.PI + 0.9);
        ctx.stroke();
      }
    }

    // Rosto
    const fo = par(0.25);
    ctx.save();
    ctx.translate(fo[0], fo[1]);
    ctx.scale(1 - Math.abs(turn) * 0.07, 1);
    const face = smoothClosed(
      [[-150, -70], [-152, 30], [-132, 112], [-78, 168], [-26, 198], [0, 205], [26, 198], [78, 168], [132, 112], [152, 30], [150, -70], [0, -215]],
      0.62,
    );
    shape(ctx, face, { base: PALETTE.skin, shade: PALETTE.skinShade, line: PALETTE.skinLine }, st, { shadeK: 2.2 });
    // Sombra da franja na testa
    ctx.save();
    ctx.clip(face);
    ctx.fillStyle = PALETTE.skinShade;
    ctx.fill(smoothClosed([[-160, -150], [160, -150], [150, -40], [80, -10], [10, -30], [-60, -5], [-150, -30]], 0.7));
    ctx.restore();
    ctx.restore();

    // Rubor e marcas demoníacas
    const cheekA = P.ParamCheek;
    for (const s of [-1, 1]) {
      const o = par(0.55);
      const c: V = [s * 88 + o[0], 92 + o[1]];
      if (cheekA > 0.02) {
        ctx.fillStyle = `rgba(255,130,150,${0.45 * cheekA})`;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], 34, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(230,90,110,${0.7 * cheekA})`;
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(c[0] + i * 12 - 5, c[1] + 8);
          ctx.lineTo(c[0] + i * 12 + 5, c[1] - 8);
          ctx.stroke();
        }
      }
      if (demon > 0.05) {
        ctx.strokeStyle = `rgba(200,10,40,${Math.min(1, demon * 1.3)})`;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(c[0] - s * 24, c[1] - 26 + i * 18);
          ctx.lineTo(c[0] + s * 18, c[1] - 14 + i * 18);
          ctx.stroke();
        }
      }
    }

    // Olhos
    for (const s of [-1, 1] as const) this.drawEye(ctx, f, s, par, turn, st);

    // Nariz
    const no = par(1.0);
    ctx.strokeStyle = PALETTE.skinLine;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(no[0] + 4, 74 + no[1]);
    ctx.quadraticCurveTo(no[0] + 10, 92 + no[1], no[0] + 2, 98 + no[1]);
    ctx.stroke();

    this.drawMouth(ctx, P, par, turn, st);

    // Cabelo: topo (casquete), tufos, mechas laterais, franja, antena
    this.drawHairFront(ctx, f, par, st);

    // Sobrancelhas aparecem por cima da franja (convenção de anime)
    for (const s of [-1, 1] as const) {
      const o = par(0.9);
      const y = (s === 1 ? P.ParamBrowLY : P.ParamBrowRY) * -14;
      const ang = (s === 1 ? P.ParamBrowLAngle : P.ParamBrowRAngle) * 0.32;
      const c: V = [s * 74 + o[0] - turn * 6, -50 + y + o[1]];
      const inner = add(c, rot([-s * 40, 0], -s * ang));
      const outer = add(c, rot([s * 42, -6], -s * ang));
      ctx.save();
      ctx.globalAlpha = 0.9;
      const brow = ribbon([inner, lerpV(inner, outer, 0.45), outer], [10, 9, 3]);
      ctx.fillStyle = mixHex('#8a5a12', '#3a0a10', demon);
      ctx.fill(brow);
      ctx.restore();
    }

    // Chifres
    if (demon > 0.12) this.drawHorns(ctx, demon, par, st, f.time);

    ctx.restore();
  }

  private drawEye(ctx: CanvasRenderingContext2D, f: PuppetFrame, s: 1 | -1, par: (d: number) => V, turn: number, st: Style) {
    const P = f.params;
    const demon = P.ParamDemon;
    const open = Math.max(0, s === 1 ? P.ParamEyeLOpen : P.ParamEyeROpen);
    const smile = s === 1 ? P.ParamEyeLSmile : P.ParamEyeRSmile;
    const o = par(0.6);
    // olho do lado para onde ele gira fica mais estreito (escorço)
    const wf = 1 - Math.max(0, s * turn) * 0.38 + Math.max(0, -s * turn) * 0.06;
    const W = 86 * wf;
    const H = 80;
    const cx = s * 72 + o[0] - turn * 10;
    const cy = 28 + o[1];
    const inner: V = [cx - s * W * 0.5, cy + 6];
    const outer: V = [cx + s * W * 0.5, cy - 4];

    if (open < 0.12) {
      // Olho fechado: "^" no sorriso, "‿" normal
      const up = smile > 0.4;
      const p = smoothOpen([inner, [cx, cy + (up ? -16 : 10)], outer]);
      ctx.strokeStyle = PALETTE.lash;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.stroke(p);
      return;
    }

    const topY = cy - H * 0.55 * open;
    const botLift = smile * H * 0.32;
    const botY = cy + H * 0.45 - botLift;
    const upper: V[] = [inner, [cx - s * W * 0.22, topY + 6], [cx + s * W * 0.12, topY], outer];
    const lower: V[] = [outer, [cx + s * W * 0.2, botY - 4], [cx - s * W * 0.15, botY], inner];
    const eye = smoothClosed([...upper, ...lower.slice(1, -1)], 0.75);

    // Branco do olho com sombra sob a pálpebra
    ctx.save();
    ctx.fillStyle = demon > 0.6 ? mixHex('#ffffff', '#2a0a12', (demon - 0.6) * 2) : '#ffffff';
    ctx.fill(eye);
    ctx.clip(eye);
    ctx.fillStyle = 'rgba(150,170,220,0.45)';
    ctx.fillRect(cx - W, topY - 10, W * 2, 22);

    // Íris
    const ix = cx + P.ParamEyeBallX * W * 0.2 * s * s + 0;
    const iy = cy + 6 - P.ParamEyeBallY * H * 0.12;
    const irx = W * 0.33;
    const iry = H * 0.46;
    const g = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
    g.addColorStop(0, mixHex(PALETTE.irisTop, PALETTE.irisDemonTop, demon));
    g.addColorStop(0.55, mixHex(PALETTE.irisMid, PALETTE.irisDemonMid, demon));
    g.addColorStop(1, mixHex(PALETTE.irisBottom, PALETTE.irisDemonBottom, demon));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mixHex('#4a2004', '#300006', demon);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Pupila (vira fenda na forma demoníaca)
    ctx.fillStyle = '#1a0806';
    ctx.beginPath();
    ctx.ellipse(ix, iy + 2, irx * (0.42 - demon * 0.3), iry * (0.5 + demon * 0.25), 0, 0, Math.PI * 2);
    ctx.fill();
    // Brilhos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ix - s * irx * 0.35, iy - iry * 0.42, irx * 0.3, iry * 0.22, -0.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(ix + s * irx * 0.3, iy + iry * 0.38, irx * 0.13, iry * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cílio superior grosso com "asinha" no canto externo
    const lash = smoothOpen([[inner[0] + s * 4, inner[1] - 2], ...upper.slice(1, -1), outer, [outer[0] + s * 16, outer[1] - 12 * open]]);
    ctx.strokeStyle = PALETTE.lash;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9;
    ctx.stroke(lash);
    // Linha inferior (só a metade externa)
    const low = smoothOpen([outer, lower[1]!, lerpV(lower[1]!, lower[2]!, 0.6)]);
    ctx.lineWidth = 3;
    ctx.stroke(low);
    // Dobra da pálpebra
    const crease = smoothOpen([[cx - s * W * 0.15, topY - 14], [cx + s * W * 0.35, topY - 10]]);
    ctx.strokeStyle = PALETTE.skinLine;
    ctx.lineWidth = 2.5;
    ctx.stroke(crease);
    void st;
  }

  private drawMouth(ctx: CanvasRenderingContext2D, P: Live2DParams, par: (d: number) => V, turn: number, st: Style) {
    const o = par(0.75);
    const cx = o[0] - turn * 8;
    const cy = 140 + o[1];
    const open = P.ParamMouthOpenY;
    const form = P.ParamMouthForm;
    const smirk = P.ParamMouthSmirk;
    const round = P.ParamMouthRound;
    const w = 46 * (1 + P.ParamMouthWide * 0.28) * (1 - round * 0.35) * (1 - Math.abs(turn) * 0.15);
    // cantos: sorriso levanta, tristeza abaixa; sorriso de canto levanta só um
    const lc: V = [cx - w / 2, cy - form * 9 + smirk * 2];
    const rc: V = [cx + w / 2, cy - form * 9 - smirk * 14];
    ctx.lineCap = 'round';
    if (open < 0.06) {
      const p = smoothOpen([lc, [cx, cy + form * 6 + 2], rc]);
      ctx.strokeStyle = PALETTE.mouth;
      ctx.lineWidth = 4.5;
      ctx.stroke(p);
      return;
    }
    const h = 10 + open * 46 * (1 + round * 0.3);
    const top: V = [cx, cy - 2 + form * 3];
    const bot: V = [cx, cy + h + form * 4];
    const path = smoothClosed([lc, [cx - w * 0.25, top[1]], [cx + w * 0.25, top[1]], rc, [cx + w * 0.3, bot[1] - 4], bot, [cx - w * 0.3, bot[1] - 4]], 0.8);
    ctx.save();
    ctx.fillStyle = PALETTE.mouth;
    ctx.fill(path);
    ctx.clip(path);
    // dentes superiores e presa (traço do Levi)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - w, top[1] - 4, w * 2, 9 + open * 4);
    if (smirk > 0.4 || P.ParamDemon > 0.3) {
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.18, top[1] + 4);
      ctx.lineTo(cx + w * 0.3, top[1] + 4);
      ctx.lineTo(cx + w * 0.24, top[1] + 16 + open * 6);
      ctx.fill();
    }
    // língua
    ctx.fillStyle = PALETTE.tongue;
    ctx.beginPath();
    ctx.ellipse(cx, bot[1] + 4, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    outline(ctx, path, '#4a0e18', st, 0.8);
  }

  private hairColors(demon: number, depthShade = 0) {
    const base = mixHex(PALETTE.hair, '#fff0c0', demon * 0.35);
    return {
      base: mixHex(base, PALETTE.hairShade, depthShade),
      shade: PALETTE.hairShade,
      line: PALETTE.hairLine,
    };
  }

  private strandPath(s: Strand, par: (d: number) => V, extraBend = 0): { path: Path2D; center: V[] } {
    const o = par(s.depth);
    const root = add(s.root, o);
    const total = sub(s.tip, s.root);
    const L = len(total);
    const n = s.chain.angles.length;
    const baseAngle = Math.atan2(total[1], total[0]);
    const center: V[] = [root];
    let a = baseAngle - s.bend * 0.5;
    for (let i = 0; i < n; i++) {
      a += s.chain.angles[i]! + (s.bend + extraBend) / n;
      center.push(add(center[i]!, mul([Math.cos(a), Math.sin(a)], L / n)));
    }
    const widths = center.map((_, i) => s.width * Math.pow(1 - i / n, 0.75) + (i === n ? 0 : 2));
    return { path: ribbon(center, widths), center };
  }

  private drawStrand(ctx: CanvasRenderingContext2D, s: Strand, par: (d: number) => V, st: Style, demon: number, shade = 0) {
    const { path, center } = this.strandPath(s, par);
    const col = this.hairColors(demon, shade);
    cel(ctx, path, col.base, col.shade, st, 1.6);
    // Pontas avermelhadas na forma demoníaca
    if (demon > 0.05) {
      const tip = center[center.length - 1]!;
      const mid = center[Math.floor(center.length / 2)]!;
      const g = ctx.createLinearGradient(mid[0], mid[1], tip[0], tip[1]);
      g.addColorStop(0, 'rgba(209,22,58,0)');
      g.addColorStop(1, `rgba(209,22,58,${0.85 * demon})`);
      ctx.fillStyle = g;
      ctx.fill(path);
    }
    // Brilho fino ao longo da mecha
    const hl = smoothOpen(center.slice(0, Math.max(2, center.length - 1)).map((p, i) => add(p, mul(perp(norm(sub(center[Math.min(i + 1, center.length - 1)]!, p))), -s.width * 0.18 * (1 - i / center.length)))));
    ctx.strokeStyle = PALETTE.hairLight;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 4;
    ctx.stroke(hl);
    ctx.globalAlpha = 1;
    outline(ctx, path, col.line, st, 0.85);
  }

  private drawHairFront(ctx: CanvasRenderingContext2D, f: PuppetFrame, par: (d: number) => V, st: Style) {
    const demon = f.params.ParamDemon;
    // Tufos de trás/cima (atrás do casquete)
    for (const t of this.hair.tufts) this.drawStrand(ctx, t, par, st, demon, 0.12);
    this.drawStrand(ctx, this.hair.ahoge, par, st, demon);
    // Casquete (topo da cabeça) com linha da raiz
    const o = par(0.3);
    ctx.save();
    ctx.translate(o[0], o[1]);
    const cap = smoothClosed([[-158, -20], [-172, -150], [-110, -228], [0, -246], [110, -228], [172, -150], [158, -20], [120, -110], [0, -150], [-120, -110]], 0.7);
    const col = this.hairColors(demon);
    cel(ctx, cap, col.base, col.shade, st, 2);
    // "Anel de anjo": faixa de brilho em zigue-zague
    ctx.save();
    ctx.clip(cap);
    ctx.fillStyle = 'rgba(255,248,210,0.75)';
    const ring: V[] = [];
    for (let i = 0; i <= 12; i++) {
      const x = -170 + i * 28.3;
      ring.push([x, -178 + (i % 2 ? 14 : -6) + Math.abs(x) * 0.12]);
    }
    for (let i = 12; i >= 0; i--) {
      const x = -170 + i * 28.3;
      ring.push([x, -160 + (i % 2 ? 22 : 2) + Math.abs(x) * 0.12]);
    }
    ctx.fill(sharpClosed(ring));
    ctx.restore();
    outline(ctx, cap, col.line, st, 0.85);
    ctx.restore();
    // Mechas laterais longas e franja
    for (const s of this.hair.sideLocks) this.drawStrand(ctx, s, par, st, demon);
    for (const b of this.hair.bangs) this.drawStrand(ctx, b, par, st, demon);
  }

  private drawHorns(ctx: CanvasRenderingContext2D, demon: number, par: (d: number) => V, st: Style, time: number) {
    const grow = Math.min(1, (demon - 0.12) / 0.6);
    const o = par(0.2);
    for (const s of [-1, 1]) {
      const root: V = [s * 92 + o[0], -190 + o[1]];
      const pts: V[] = [root];
      let a = -Math.PI / 2 + s * 0.55;
      for (let i = 0; i < 4; i++) {
        a -= s * 0.32;
        pts.push(add(pts[i]!, mul(dir(a), 46 * grow)));
      }
      const path = ribbon(pts, [44 * grow, 36 * grow, 26 * grow, 14 * grow, 0]);
      shape(ctx, path, { base: PALETTE.horn, shade: PALETTE.hornShade, line: '#050003' }, st);
      // brilho vermelho pulsando na borda
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 4);
      ctx.strokeStyle = PALETTE.hornGlow;
      ctx.lineWidth = 3;
      ctx.stroke(smoothOpen(pts.map((p) => add(p, [-s * 6, 0]))));
      ctx.restore();
    }
  }
}

// ------------------------------------------------------------------------------------------------

const rot = (v: V, a: number): V => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

interface ArmPose {
  shoulder: V;
  elbow: V;
  wrist: V;
  handDir: V;
  front: boolean;
  hand: HandShape;
  depth: number;
}

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const qOf = (r: { x: number; y: number; z: number }) => new THREE.Quaternion().setFromEuler(tmpE.set(r.x, r.y, r.z));

/**
 * Cinemática direta do braço com as rotações da Pose (mesmas convenções do VRM)
 * e projeção ortográfica na tela. Comprimentos em unidades de desenho.
 */
function armChain(pose: Pose, side: 'left' | 'right', shoulderScreen: V, hand: HandShape): ArmPose {
  const b = pose.bones;
  const s = side === 'left' ? 1 : -1;
  const base = new THREE.Vector3(s, 0, 0);
  const chest = qOf(b.spine).multiply(qOf(b.chest)).multiply(qOf(b.upperChest));
  const sh = b[`${side}Shoulder`];
  const ua = { ...b[`${side}UpperArm`] };
  // Braço relaxado mais junto ao corpo (só quando está apontando para baixo).
  const down = Math.max(0, Math.min(1, (s * -ua.z - 0.8) / 0.4));
  // Esquerdo desce com Z− e direito com Z+ (convenção VRM).
  ua.z -= s * 0.3 * down;
  const qSh = chest.clone().multiply(qOf(sh));
  const qUa = qSh.clone().multiply(qOf(ua));
  const qLa = qUa.clone().multiply(qOf(b[`${side}LowerArm`]));
  const qHa = qLa.clone().multiply(qOf(b[`${side}Hand`]));
  const lift = qSh.clone();
  void tmpQ;
  const shoulderOffset = base.clone().applyQuaternion(lift).sub(base);
  const to2 = (v: THREE.Vector3): V => [v.x * M, -v.y * M];
  const shoulder = add(shoulderScreen, mul(to2(shoulderOffset), 0.05));
  const dUa = base.clone().applyQuaternion(qUa);
  const dLa = base.clone().applyQuaternion(qLa);
  const dHa = base.clone().applyQuaternion(qHa);
  const elbow3 = dUa.clone().multiplyScalar(0.235);
  const wrist3 = elbow3.clone().add(dLa.clone().multiplyScalar(0.215));
  const elbow = add(shoulder, to2(elbow3));
  const wrist = add(shoulder, to2(wrist3));
  return { shoulder, elbow, wrist, handDir: norm(to2(dHa)), front: wrist3.z > 0.06, hand, depth: wrist3.z };
}

function drawArm(ctx: CanvasRenderingContext2D, a: ArmPose, st: Style, side: 'left' | 'right') {
  const coat = { base: PALETTE.coat, shade: PALETTE.coatShade, line: PALETTE.coatLine };
  // Manga superior e antebraço (mais largos perto do ombro)
  const upper = ribbon([a.shoulder, lerpV(a.shoulder, a.elbow, 0.5), a.elbow], [110, 92, 84], false);
  shape(ctx, upper, coat, st, { shadeK: 1.8 });
  const lower = ribbon([a.elbow, lerpV(a.elbow, a.wrist, 0.5), a.wrist], [84, 76, 70], false);
  shape(ctx, lower, coat, st, { shadeK: 1.8 });
  // Cotovelo arredondado
  ctx.fillStyle = PALETTE.coat;
  ctx.beginPath();
  ctx.arc(a.elbow[0], a.elbow[1], 38, 0, Math.PI * 2);
  ctx.fill();
  // Punho dourado
  const fd = norm(sub(a.wrist, a.elbow));
  const cuffC = add(a.wrist, mul(fd, -20));
  const cuff = ribbon([add(cuffC, mul(fd, -18)), add(cuffC, mul(fd, 18))], [84, 84], false);
  shape(ctx, cuff, { base: PALETTE.gold, shade: PALETTE.goldShade, line: PALETTE.goldLine }, st);
  // Ombreira dourada só no ombro esquerdo do personagem (assimetria do figurino)
  if (side === 'left') {
    const ud = norm(sub(a.elbow, a.shoulder));
    const c = add(a.shoulder, mul(ud, 30));
    const plates = [0, 1, 2].map((i) => {
      const cc = add(c, mul(ud, i * 34));
      const n = perp(ud);
      return smoothClosed([add(cc, mul(n, 70 - i * 6)), add(cc, mul(ud, -34)), add(cc, mul(n, -70 + i * 6)), add(cc, mul(ud, 22))], 0.7);
    });
    for (let i = plates.length - 1; i >= 0; i--) shape(ctx, plates[i]!, { base: i ? '#3a3f6e' : PALETTE.gold, shade: i ? '#262a4a' : PALETTE.goldShade, line: PALETTE.coatLine }, st);
  }
  drawHand(ctx, a, st);
}

function drawHand(ctx: CanvasRenderingContext2D, a: ArmPose, st: Style) {
  const d = a.handDir;
  const n = perp(d);
  const w = a.wrist;
  const glove = { base: PALETTE.glove, shade: PALETTE.gloveShade, line: '#08060c' };
  const palmC = add(w, mul(d, 42));
  const palm = smoothClosed([add(w, mul(n, 30)), add(palmC, mul(n, 34)), add(palmC, add(mul(d, 38), mul(n, 22))), add(palmC, add(mul(d, 40), mul(n, -22))), add(palmC, mul(n, -34)), add(w, mul(n, -30))], 0.8);
  shape(ctx, palm, glove, st);
  // Polegar
  const thumb = ribbon([add(w, add(mul(d, 20), mul(n, -26))), add(w, add(mul(d, 48), mul(n, -48))), add(w, add(mul(d, 70), mul(n, -46)))], [26, 22, 16]);
  shape(ctx, thumb, glove, st);
  if (a.hand === 'point') {
    const finger = ribbon([add(palmC, mul(d, 30)), add(palmC, mul(d, 80)), add(palmC, mul(d, 112))], [24, 22, 18], false);
    shape(ctx, finger, glove, st);
  } else {
    // Dedos sugeridos por linhas (estilo anime)
    ctx.strokeStyle = '#08060c';
    ctx.lineWidth = 3;
    for (const k of [-0.33, 0, 0.33]) {
      const p0 = add(palmC, add(mul(d, 18), mul(n, k * 60)));
      const p1 = add(p0, mul(d, a.hand === 'open' ? 34 : 18));
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
    }
  }
}
