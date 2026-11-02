import * as THREE from 'three';
import type { HumanBone } from '@/core/animation/types';

/**
 * LEVI — MODELO PROVISÓRIO PROCEDURAL.
 *
 * Construído 100% em código com primitivas do Three.js (nenhum arquivo externo,
 * portanto sem pendências de licença). Serve para desenvolver e testar todo o
 * sistema de animação enquanto o modelo final (VRM) não existe.
 *
 * O esqueleto segue exatamente os nomes e convenções do VRM 1.0 humanoide
 * (olha para +Z, braços em T-pose ao longo de ±X), por isso as mesmas poses
 * valem para o modelo final.
 */

export const LEVI_PALETTE = {
  skin: '#f6d9c4',
  hair: '#f4cd55',
  hairDemon: '#ffe9a8',
  coat: '#2e2448',
  coatTrim: '#a3122a',
  armor: '#4a4360',
  gold: '#d4a640',
  leather: '#3a2618',
  eyeWhite: '#ffffff',
  eyeWhiteDemon: '#1a0508',
  iris: '#e0a020',
  irisDemon: '#ff1a3c',
  brow: '#c79a2c',
  mouth: '#5a1822',
  horn: '#16101c',
} as const;

export interface LeviModel {
  root: THREE.Group;
  bones: Record<HumanBone, THREE.Object3D>;
  hipsBaseY: number;
  face: {
    eyes: { group: THREE.Group; iris: THREE.Group; side: 1 | -1 }[];
    brows: { mesh: THREE.Mesh; side: 1 | -1; baseY: number }[];
    mouthOpen: THREE.Mesh;
    smile: THREE.Mesh;
    frown: THREE.Mesh;
    mouthLine: THREE.Mesh;
  };
  breathTargets: THREE.Object3D[];
  cape: THREE.Mesh;
  demon: {
    horns: THREE.Group[];
    marks: THREE.Mesh[];
    aura: THREE.Mesh;
    light: THREE.PointLight;
    hairMat: THREE.MeshStandardMaterial;
    scleraMat: THREE.MeshBasicMaterial;
    irisMat: THREE.MeshStandardMaterial;
    trimMat: THREE.MeshStandardMaterial;
  };
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
}

export function buildLevi(): LeviModel {
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.Material>(m: T) => (materials.push(m), m);
  const geo = <T extends THREE.BufferGeometry>(g: T) => (geometries.push(g), g);

  const P = LEVI_PALETTE;
  const std = (color: string, rough = 0.7, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));

  const skin = std(P.skin, 0.65);
  const hairMat = std(P.hair, 0.45, 0.05, { emissive: new THREE.Color('#ff6a00'), emissiveIntensity: 0 });
  const coat = std(P.coat, 0.8);
  const trimMat = std(P.coatTrim, 0.5, 0.1, { emissive: new THREE.Color('#ff0030'), emissiveIntensity: 0 });
  const armor = std(P.armor, 0.35, 0.7);
  const gold = std(P.gold, 0.3, 0.9);
  const leather = std(P.leather, 0.8);
  const hornMat = std(P.horn, 0.3, 0.4, { emissive: new THREE.Color('#5a0010'), emissiveIntensity: 0.4 });
  const capeOut = std(P.coat, 0.85, 0, { side: THREE.FrontSide });
  const capeIn = std(P.coatTrim, 0.7, 0, { side: THREE.BackSide });

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
    const o = new THREE.Mesh(geo(g), m);
    o.castShadow = shadow;
    o.receiveShadow = shadow;
    return o;
  };
  const group = (name: string, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    return g;
  };

  // ---------- Esqueleto ----------
  const root = group('LeviProvisorio');
  const hipsBaseY = 0.95;
  const bones = {} as Record<HumanBone, THREE.Object3D>;
  const bone = (name: HumanBone, parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const g = group(name, x, y, z);
    parent.add(g);
    bones[name] = g;
    return g;
  };
  const hips = bone('hips', root, 0, hipsBaseY);
  const spine = bone('spine', hips, 0, 0.1);
  const chest = bone('chest', spine, 0, 0.14);
  const upperChest = bone('upperChest', chest, 0, 0.12);
  const neck = bone('neck', upperChest, 0, 0.14);
  const head = bone('head', neck, 0, 0.09);
  for (const s of [1, -1] as const) {
    const side = s === 1 ? 'left' : 'right';
    const sh = bone(`${side}Shoulder`, upperChest, 0.05 * s, 0.08);
    const ua = bone(`${side}UpperArm`, sh, 0.12 * s, 0);
    const la = bone(`${side}LowerArm`, ua, 0.27 * s, 0);
    bone(`${side}Hand`, la, 0.25 * s, 0);
    const ul = bone(`${side}UpperLeg`, hips, 0.09 * s, -0.06);
    const ll = bone(`${side}LowerLeg`, ul, 0, -0.42);
    bone(`${side}Foot`, ll, 0, -0.4);
    void ua;
  }

  /** Cápsula entre a origem do osso e `len` ao longo de um eixo. */
  const limb = (parent: THREE.Object3D, len: number, r: number, mat: THREE.Material, axis: 'x' | '-x' | '-y', sx = 1, sz = 1) => {
    const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 14), mat);
    if (axis === '-y') m.position.y = -len / 2;
    else {
      m.rotation.z = Math.PI / 2;
      m.position.x = axis === 'x' ? len / 2 : -len / 2;
    }
    m.scale.set(sx, 1, sz);
    parent.add(m);
    return m;
  };

  // ---------- Corpo / roupa de guerreiro ----------
  const pelvis = mesh(new THREE.SphereGeometry(0.15, 20, 14), coat);
  pelvis.scale.set(1.05, 0.75, 0.75);
  hips.add(pelvis);
  const belt = mesh(new THREE.TorusGeometry(0.145, 0.02, 8, 32), leather);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.02, 0.78, 1);
  belt.position.y = 0.06;
  hips.add(belt);
  const buckle = mesh(new THREE.BoxGeometry(0.05, 0.04, 0.015), gold);
  buckle.position.set(0, 0.06, 0.118);
  hips.add(buckle);
  // Aba frontal do sobretudo
  const tasset = mesh(new THREE.BoxGeometry(0.2, 0.32, 0.02), coat);
  tasset.position.set(0, -0.12, 0.11);
  tasset.rotation.x = 0.08;
  hips.add(tasset);
  const tassetTrim = mesh(new THREE.BoxGeometry(0.205, 0.02, 0.025), trimMat);
  tassetTrim.position.set(0, -0.28, 0.122);
  tassetTrim.rotation.x = 0.08;
  hips.add(tassetTrim);

  const abdomen = mesh(new THREE.CapsuleGeometry(0.12, 0.12, 6, 18), coat);
  abdomen.position.y = 0.08;
  abdomen.scale.set(1.1, 1, 0.8);
  spine.add(abdomen);

  const torso = mesh(new THREE.CapsuleGeometry(0.14, 0.12, 6, 20), coat);
  torso.position.y = 0.1;
  torso.scale.set(1.15, 1, 0.78);
  chest.add(torso);
  // Peitoral de armadura com bordas douradas
  const plate = mesh(new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), armor);
  plate.rotation.x = Math.PI / 2;
  plate.scale.set(1.05, 0.55, 0.95);
  plate.position.set(0, 0.11, 0.035);
  chest.add(plate);
  // Lapelas douradas em V
  for (const s of [1, -1]) {
    const lapel = mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), gold);
    lapel.position.set(0.05 * s, 0.17, 0.112);
    lapel.rotation.set(-0.25, 0, 0.42 * s);
    chest.add(lapel);
  }
  const gem = mesh(new THREE.OctahedronGeometry(0.022), trimMat);
  gem.position.set(0, 0.12, 0.125);
  gem.scale.set(1, 1.4, 0.6);
  chest.add(gem);

  const shoulders = mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 18), coat);
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 0.06;
  shoulders.scale.set(1, 1, 0.75);
  upperChest.add(shoulders);
  // Gola alta
  const collar = mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.1, 20, 1, true, Math.PI * 0.15, Math.PI * 1.7), coat);
  collar.position.y = 0.14;
  collar.rotation.y = Math.PI;
  upperChest.add(collar);
  const collarIn = mesh(new THREE.CylinderGeometry(0.073, 0.093, 0.098, 20, 1, true, Math.PI * 0.15, Math.PI * 1.7), trimMat);
  (collarIn.material as THREE.Material).side = THREE.DoubleSide;
  collarIn.position.y = 0.14;
  collarIn.rotation.y = Math.PI;
  upperChest.add(collarIn);
  const neckMesh = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 14), skin);
  neckMesh.position.y = 0.05;
  neck.add(neckMesh);

  // Capa
  const capeGeo = new THREE.PlaneGeometry(0.46, 1.0, 8, 12);
  const pos = capeGeo.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const down = (0.5 - y) / 1.0; // 0 no topo, 1 embaixo
    pos.setZ(i, -Math.cos((x / 0.46) * Math.PI) * 0.06 - down * 0.12);
    pos.setX(i, x * (1 + down * 0.5));
  }
  capeGeo.computeVertexNormals();
  geometries.push(capeGeo);
  const cape = new THREE.Mesh(capeGeo, capeOut);
  cape.castShadow = true;
  const capeInner = new THREE.Mesh(capeGeo, capeIn);
  cape.add(capeInner);
  cape.position.set(0, -0.42, -0.12);
  cape.rotation.x = 0.05;
  const capePivot = group('capePivot', 0, 0.12, 0);
  capePivot.add(cape);
  upperChest.add(capePivot);

  // Braços
  for (const s of [1, -1] as const) {
    const side = s === 1 ? 'left' : 'right';
    const ax = s === 1 ? 'x' : '-x';
    limb(bones[`${side}UpperArm`], 0.27, 0.05, coat, ax);
    limb(bones[`${side}LowerArm`], 0.25, 0.042, coat, ax);
    // Ombreira
    const pauld = mesh(new THREE.SphereGeometry(0.085, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), armor);
    pauld.scale.set(1.1, 0.75, 1);
    pauld.position.set(0.03 * s, 0.025, 0);
    pauld.rotation.z = -0.35 * s;
    bones[`${side}UpperArm`].add(pauld);
    const pauldTrim = mesh(new THREE.TorusGeometry(0.085, 0.009, 6, 28), gold);
    pauldTrim.rotation.x = Math.PI / 2;
    pauld.add(pauldTrim);
    // Manopla
    const gaunt = mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.11, 14), armor);
    gaunt.rotation.z = Math.PI / 2;
    gaunt.position.x = 0.19 * s;
    bones[`${side}LowerArm`].add(gaunt);
    const gauntTrim = mesh(new THREE.TorusGeometry(0.056, 0.007, 6, 20), gold);
    gauntTrim.rotation.y = Math.PI / 2;
    gauntTrim.position.x = 0.135 * s;
    bones[`${side}LowerArm`].add(gauntTrim);
    // Mão (luva)
    const hand = mesh(new THREE.SphereGeometry(0.045, 14, 10), leather);
    hand.scale.set(1.3, 0.75, 1);
    hand.position.x = 0.045 * s;
    bones[`${side}Hand`].add(hand);
    const thumb = mesh(new THREE.CapsuleGeometry(0.014, 0.03, 4, 8), leather);
    thumb.position.set(0.03 * s, 0, 0.035);
    thumb.rotation.z = Math.PI / 2;
    thumb.rotation.y = -0.6 * s;
    bones[`${side}Hand`].add(thumb);

    // Pernas
    limb(bones[`${side}UpperLeg`], 0.42, 0.075, coat, '-y');
    limb(bones[`${side}LowerLeg`], 0.4, 0.06, leather, '-y');
    const boot = mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.22, 14), leather);
    boot.position.y = -0.27;
    bones[`${side}LowerLeg`].add(boot);
    const bootTrim = mesh(new THREE.TorusGeometry(0.069, 0.008, 6, 20), gold);
    bootTrim.rotation.x = Math.PI / 2;
    bootTrim.position.y = -0.16;
    bones[`${side}LowerLeg`].add(bootTrim);
    const knee = mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), armor);
    knee.rotation.x = Math.PI / 2;
    knee.position.set(0, -0.01, 0.045);
    bones[`${side}LowerLeg`].add(knee);
    const foot = mesh(new THREE.BoxGeometry(0.1, 0.06, 0.22), leather);
    foot.position.set(0, -0.025, 0.05);
    bones[`${side}Foot`].add(foot);
  }

  // Espada embainhada no quadril esquerdo
  const sword = group('espada', 0.17, 0.02, -0.02);
  sword.rotation.set(0.15, 0, 0.35);
  const sheath = mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.6, 10), leather);
  sheath.position.y = -0.28;
  const guard = mesh(new THREE.BoxGeometry(0.11, 0.018, 0.03), gold);
  const grip = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), armor);
  grip.position.y = 0.06;
  const pommel = mesh(new THREE.SphereGeometry(0.018, 10, 8), gold);
  pommel.position.y = 0.115;
  sword.add(sheath, guard, grip, pommel);
  hips.add(sword);

  // ---------- Cabeça ----------
  const HEAD_R = 0.12;
  const headCenter = group('headCenter', 0, 0.1, 0);
  head.add(headCenter);
  const skull = mesh(new THREE.SphereGeometry(HEAD_R, 32, 24), skin);
  skull.scale.set(0.95, 1, 0.98);
  headCenter.add(skull);
  for (const s of [1, -1]) {
    const ear = mesh(new THREE.SphereGeometry(0.022, 10, 8), skin);
    ear.scale.set(0.5, 1.2, 0.9);
    ear.position.set(0.112 * s, -0.005, 0);
    headCenter.add(ear);
  }
  const nose = mesh(new THREE.ConeGeometry(0.009, 0.025, 8), skin);
  nose.rotation.x = Math.PI / 2 + 0.4;
  nose.position.set(0, -0.025, 0.12);
  headCenter.add(nose);

  // Olhos (estilo anime: grandes, íris dourada)
  const scleraMat = track(new THREE.MeshBasicMaterial({ color: P.eyeWhite }));
  const irisMat = std(P.iris, 0.3, 0, { emissive: new THREE.Color(P.irisDemon), emissiveIntensity: 0 });
  const pupilMat = track(new THREE.MeshBasicMaterial({ color: '#120808' }));
  const shineMat = track(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const lashMat = track(new THREE.MeshBasicMaterial({ color: '#2a1a10' }));
  const eyes: LeviModel['face']['eyes'] = [];
  for (const s of [1, -1] as const) {
    const eg = group(`olho_${s === 1 ? 'esq' : 'dir'}`, 0.043 * s, 0.002, 0.109);
    eg.rotation.y = 0.32 * s;
    const sclera = new THREE.Mesh(geo(new THREE.CircleGeometry(0.026, 24)), scleraMat);
    sclera.scale.set(1, 1.18, 1);
    const iris = group('iris', 0, -0.002, 0.001);
    const irisDisc = new THREE.Mesh(geo(new THREE.CircleGeometry(0.018, 24)), irisMat);
    irisDisc.scale.set(0.9, 1.15, 1);
    const pupil = new THREE.Mesh(geo(new THREE.CircleGeometry(0.008, 16)), pupilMat);
    pupil.position.z = 0.0005;
    pupil.scale.set(0.9, 1.3, 1);
    const shine = new THREE.Mesh(geo(new THREE.CircleGeometry(0.005, 12)), shineMat);
    shine.position.set(0.006, 0.009, 0.001);
    iris.add(irisDisc, pupil, shine);
    const lash = new THREE.Mesh(geo(new THREE.TorusGeometry(0.027, 0.0035, 4, 20, Math.PI)), lashMat);
    lash.scale.set(1, 1.1, 1);
    lash.position.z = 0.001;
    eg.add(sclera, iris, lash);
    headCenter.add(eg);
    eyes.push({ group: eg, iris, side: s });
  }
  // Sobrancelhas
  const browMat = std(P.brow, 0.6);
  const brows: LeviModel['face']['brows'] = [];
  for (const s of [1, -1] as const) {
    const b = mesh(new THREE.BoxGeometry(0.04, 0.0065, 0.006), browMat, false);
    b.position.set(0.045 * s, 0.045, 0.113);
    b.rotation.y = 0.3 * s;
    headCenter.add(b);
    brows.push({ mesh: b, side: s, baseY: 0.045 });
  }
  // Boca
  const mouthMat = track(new THREE.MeshBasicMaterial({ color: P.mouth }));
  const mouthGroup = group('boca', 0, -0.058, 0.113);
  mouthGroup.rotation.x = -0.25;
  headCenter.add(mouthGroup);
  const mouthOpen = new THREE.Mesh(geo(new THREE.CircleGeometry(0.016, 20)), mouthMat);
  const smile = new THREE.Mesh(geo(new THREE.TorusGeometry(0.016, 0.0025, 4, 16, Math.PI)), mouthMat);
  smile.rotation.z = Math.PI; // arco em "U"
  smile.position.set(0, 0.012, 0.001);
  const frown = new THREE.Mesh(geo(new THREE.TorusGeometry(0.014, 0.0025, 4, 16, Math.PI)), mouthMat);
  frown.position.set(0, -0.008, 0.001);
  const mouthLine = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.024, 0.0035)), mouthMat);
  mouthGroup.add(mouthOpen, smile, frown, mouthLine);

  // Marcas demoníacas nas bochechas
  const markMat = track(new THREE.MeshBasicMaterial({ color: '#ff1a3c', transparent: true, opacity: 0 }));
  const marks: THREE.Mesh[] = [];
  for (const s of [1, -1]) {
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.03, 0.004)), markMat);
      m.position.set(0.068 * s, -0.03 - i * 0.012, 0.094);
      m.rotation.set(0, 0.6 * s, -0.25 * s);
      headCenter.add(m);
      marks.push(m);
    }
  }

  // ---------- Cabelo loiro espetado ----------
  const hairGroup = group('cabelo', 0, 0, 0);
  headCenter.add(hairGroup);
  const cap = mesh(new THREE.SphereGeometry(HEAD_R * 1.07, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
  cap.rotation.x = -0.32;
  cap.position.set(0, 0.008, -0.008);
  hairGroup.add(cap);
  const back = mesh(new THREE.SphereGeometry(HEAD_R * 1.05, 24, 16), hairMat);
  back.scale.set(1, 1, 0.9);
  back.position.set(0, -0.005, -0.03);
  hairGroup.add(back);
  const spike = (len: number, r: number, x: number, y: number, z: number, rx: number, rz: number, ry = 0) => {
    const c = mesh(new THREE.ConeGeometry(r, len, 7), hairMat);
    const pivot = group('mecha', x, y, z);
    c.position.y = len / 2;
    pivot.rotation.set(rx, ry, rz, 'YXZ');
    pivot.add(c);
    hairGroup.add(pivot);
  };
  // Mechas de cima/trás apontando para fora (visual "espetado")
  // [x, y, z, rotX (negativo = varre para trás), rotZ, comprimento, raio]
  const ring = [
    [0.03, 0.12, 0.03, -0.55, -0.3, 0.12, 0.038], // duas mechas frontais: marca registrada do Levi
    [-0.03, 0.12, 0.03, -0.55, 0.3, 0.12, 0.038],
    [0, 0.11, -0.02, -1.0, 0, 0.13, 0.04],
    [0.06, 0.1, -0.03, -1.0, -0.5, 0.12, 0.038],
    [-0.06, 0.1, -0.03, -1.0, 0.5, 0.12, 0.038],
    [0.09, 0.05, -0.04, -1.2, -1.1, 0.11, 0.035],
    [-0.09, 0.05, -0.04, -1.2, 1.1, 0.11, 0.035],
    [0, 0.06, -0.09, -1.5, 0, 0.14, 0.042],
    [0.06, 0.01, -0.1, -1.8, -0.5, 0.12, 0.038],
    [-0.06, 0.01, -0.1, -1.8, 0.5, 0.12, 0.038],
    [0, -0.04, -0.1, -2.3, 0, 0.12, 0.04],
    [0.1, -0.01, -0.05, -1.9, -1.2, 0.1, 0.032],
    [-0.1, -0.01, -0.05, -1.9, 1.2, 0.1, 0.032],
  ] as const;
  for (const [x, y, z, rx, rz, len, r] of ring) spike(len, r, x, y, z, rx, rz);
  // Franja caindo sobre a testa (termina acima dos olhos)
  const bangs = [
    [0.0, 0.09, 0.088, 0.075, 0.026, 0],
    [0.04, 0.088, 0.083, 0.085, 0.026, 0.3],
    [-0.04, 0.088, 0.083, 0.085, 0.026, -0.3],
    [0.075, 0.07, 0.062, 0.1, 0.024, 0.35],
    [-0.075, 0.07, 0.062, 0.1, 0.024, -0.35],
  ] as const;
  for (const [x, y, z, len, r, rz] of bangs) spike(len, r, x, y, z, Math.PI - 0.35, rz);
  // Mechas laterais (costeletas longas)
  for (const s of [1, -1]) spike(0.13, 0.025, 0.1 * s, 0.02, 0.03, Math.PI - 0.1, -0.12 * s);

  // ---------- Transformação demoníaca ----------
  const horns: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const h = group(`chifre_${s === 1 ? 'esq' : 'dir'}`, 0.07 * s, 0.09, 0.0);
    h.rotation.set(-0.45, 0, -0.6 * s);
    const segs = [
      [0.034, 0.09, 0, 0],
      [0.024, 0.08, 0.08, -0.4],
      [0.014, 0.065, 0.07, -0.55],
    ] as const;
    let parent: THREE.Object3D = h;
    for (const [r, len, offset, bend] of segs) {
      const seg = group('seg', 0, offset, 0);
      seg.rotation.x = bend;
      const c = mesh(new THREE.ConeGeometry(r, len, 10), hornMat);
      c.position.y = len / 2;
      seg.add(c);
      parent.add(seg);
      parent = seg;
    }
    h.scale.setScalar(0.0001);
    headCenter.add(h);
    horns.push(h);
  }

  // Aura (textura radial gerada em canvas quando houver DOM)
  let auraTex: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,40,70,0.9)');
      g.addColorStop(0.4, 'rgba(160,0,40,0.45)');
      g.addColorStop(1, 'rgba(60,0,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      auraTex = new THREE.CanvasTexture(c);
    }
  }
  const auraMat = track(
    new THREE.MeshBasicMaterial({
      map: auraTex,
      color: auraTex ? '#ffffff' : '#ff2050',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const aura = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.6, 2.2)), auraMat);
  aura.position.set(0, 0.95, -0.35);
  aura.visible = false;
  root.add(aura);

  const light = new THREE.PointLight('#ff2050', 0, 2.5, 2);
  light.position.set(0, 0.15, 0.4);
  chest.add(light);

  return {
    root,
    bones,
    hipsBaseY,
    face: { eyes, brows, mouthOpen, smile, frown, mouthLine },
    breathTargets: [torso, plate, shoulders],
    cape,
    demon: { horns, marks, aura, light, hairMat, scleraMat, irisMat, trimMat },
    materials,
    geometries,
  };
}
