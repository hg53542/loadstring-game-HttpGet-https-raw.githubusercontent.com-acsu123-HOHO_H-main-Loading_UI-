import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AnimationController } from '@/core/animation/AnimationController';
import { createRestPose } from '@/core/animation/math';
import { HUMAN_BONES } from '@/core/animation/types';
import { GESTURE_DEFS } from '@/core/animation/layers/gestures';
import { ProceduralRig } from '../rigs/ProceduralRig';
import { VrmRig } from '../rigs/VrmRig';

describe('ProceduralRig (modelo provisório)', () => {
  it('cria todos os ossos humanoides e se identifica como provisório', () => {
    const rig = new ProceduralRig();
    expect(rig.isPlaceholder).toBe(true);
    expect(rig.label).toMatch(/provisório/i);
    for (const b of HUMAN_BONES) expect(rig.model.bones[b]).toBeInstanceOf(THREE.Object3D);
    let meshes = 0;
    rig.root.traverse((o) => (o as THREE.Mesh).isMesh && meshes++);
    expect(meshes).toBeGreaterThan(50); // é um modelo 3D de verdade, não um sprite
  });

  it('tem altura humana (~1.7–1.9 m) com cabeça acima de 1.5 m', () => {
    const rig = new ProceduralRig();
    rig.apply(createRestPose(), 0);
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    rig.root.traverseVisible((o) => {
      if ((o as THREE.Mesh).isMesh) box.union(new THREE.Box3().setFromObject(o, true));
    });
    expect(box.max.y).toBeGreaterThan(1.65);
    expect(box.max.y).toBeLessThan(1.95);
    expect(box.min.y).toBeLessThan(0.1);
    const headY = rig.model.bones.head.getWorldPosition(new THREE.Vector3()).y;
    expect(headY).toBeGreaterThan(1.5);
  });

  it('aplica rotações da pose nos ossos', () => {
    const rig = new ProceduralRig();
    const pose = createRestPose();
    pose.bones.head.y = 0.3;
    pose.bones.leftUpperArm.z = 0.5;
    pose.hipsOffsetY = 0.05;
    rig.apply(pose, 0.016);
    expect(rig.model.bones.head.rotation.y).toBeCloseTo(0.3);
    expect(rig.model.bones.leftUpperArm.rotation.z).toBeCloseTo(0.5);
    expect(rig.model.bones.hips.position.y).toBeCloseTo(rig.model.hipsBaseY + 0.05);
  });

  it('piscada fecha os olhos e surpresa os arregala', () => {
    const rig = new ProceduralRig();
    const pose = createRestPose();
    rig.apply(pose, 0);
    const openY = rig.model.face.eyes[0]!.group.scale.y;
    pose.expressions.blink = 1;
    rig.apply(pose, 0);
    expect(rig.model.face.eyes[0]!.group.scale.y).toBeLessThan(openY * 0.1);
    pose.expressions.blink = 0;
    pose.expressions.surprised = 1;
    rig.apply(pose, 0);
    expect(rig.model.face.eyes[0]!.group.scale.y).toBeGreaterThan(openY);
  });

  it('boca abre com "aa" e sorri com "happy"', () => {
    const rig = new ProceduralRig();
    const pose = createRestPose();
    rig.apply(pose, 0);
    expect(rig.model.face.mouthLine.visible).toBe(true);
    pose.expressions.aa = 1;
    rig.apply(pose, 0);
    expect(rig.model.face.mouthOpen.visible).toBe(true);
    pose.expressions.aa = 0;
    pose.expressions.happy = 1;
    rig.apply(pose, 0);
    expect(rig.model.face.smile.visible).toBe(true);
  });

  it('forma demoníaca faz crescer chifres, aura e brilho nos olhos', () => {
    const rig = new ProceduralRig();
    const pose = createRestPose();
    rig.apply(pose, 0);
    expect(rig.model.demon.horns[0]!.scale.x).toBeLessThan(0.01);
    expect(rig.model.demon.aura.visible).toBe(false);
    pose.demon = 1;
    rig.apply(pose, 0);
    expect(rig.model.demon.horns[0]!.scale.x).toBeCloseTo(1);
    expect(rig.model.demon.aura.visible).toBe(true);
    expect(rig.model.demon.irisMat.emissiveIntensity).toBeGreaterThan(1);
  });

  it('roda 10 s de animação completa sem NaN', () => {
    const rig = new ProceduralRig();
    const ctrl = new AnimationController({ seed: 1 });
    ctrl.setDemon(1);
    ctrl.playGesture('celebrate');
    for (let i = 0; i < 600; i++) rig.apply(ctrl.update(1 / 60), 1 / 60);
    rig.root.traverse((o) => {
      expect(Number.isFinite(o.rotation.x + o.rotation.y + o.rotation.z + o.position.y)).toBe(true);
    });
    rig.dispose();
  });
});

describe('VrmRig (adaptador para o modelo final)', () => {
  function fakeVrm(available: string[]) {
    const nodes = new Map<string, THREE.Object3D>();
    for (const b of HUMAN_BONES) if (b !== 'upperChest') nodes.set(b, new THREE.Object3D());
    nodes.get('hips')!.position.y = 1;
    const values = new Map<string, number>();
    const lookAt = { target: new THREE.Object3D() as THREE.Object3D | null, autoUpdate: true, yaw: 0, pitch: 0 };
    const vrm = {
      scene: new THREE.Group(),
      meta: { name: 'Teste' },
      humanoid: { getNormalizedBoneNode: (n: string) => nodes.get(n) ?? null },
      expressionManager: {
        getExpression: (n: string) => (available.includes(n) ? {} : null),
        setValue: (n: string, v: number) => values.set(n, v),
      },
      lookAt,
      update: vi.fn(),
    };
    return { vrm, nodes, values, lookAt };
  }

  it('mapeia ossos, expressões, olhar e chama vrm.update', () => {
    const { vrm, nodes, values, lookAt } = fakeVrm(['blink', 'happy', 'aa', 'demon']);
    const rig = new VrmRig(vrm as never);
    expect(lookAt.target).toBeNull();
    expect(rig.label).toBe('Teste');
    expect(rig.isPlaceholder).toBe(true); // só vira "final" quando declarado explicitamente

    const pose = createRestPose();
    pose.bones.head.x = 0.2;
    pose.expressions.happy = 0.7;
    pose.lookAt.yaw = Math.PI / 18; // 10°
    pose.demon = 0.5;
    pose.hipsOffsetY = 0.1;
    rig.apply(pose, 0.016);

    expect(nodes.get('head')!.rotation.x).toBeCloseTo(0.2);
    expect(nodes.get('hips')!.position.y).toBeCloseTo(1.1);
    expect(values.get('happy')).toBeCloseTo(0.7);
    expect(values.get('demon')).toBeCloseTo(0.5);
    expect(values.has('sad')).toBe(false); // não existe no modelo: ignorado sem erro
    expect(lookAt.yaw).toBeCloseTo(10);
    expect(vrm.update).toHaveBeenCalledWith(0.016);
  });
});

describe('Gestos no modelo provisório (posição das mãos no pico)', () => {
  function handsAtPeak(gesture: 'wave' | 'think' | 'celebrate' | 'point') {
    const rig = new ProceduralRig();
    const ctrl = new AnimationController({ seed: 1, settings: { breathingIntensity: 0, headMotion: 0, autoBlink: false } });
    ctrl.playGesture(gesture);
    const frames = Math.round(GESTURE_DEFS[gesture].duration * 60 * 0.5);
    for (let i = 0; i < frames; i++) rig.apply(ctrl.update(1 / 60), 1 / 60);
    rig.root.updateMatrixWorld(true);
    const w = (b: 'rightHand' | 'leftHand' | 'head') => rig.model.bones[b].getWorldPosition(new THREE.Vector3());
    return { right: w('rightHand'), left: w('leftHand'), head: w('head') };
  }

  it('acenar: mão ao lado da cabeça e dentro do quadro "busto"', () => {
    const { right, head } = handsAtPeak('wave');
    expect(right.y).toBeGreaterThan(head.y);
    expect(Math.abs(right.x)).toBeLessThan(0.36);
  });

  it('pensar: mão perto do queixo', () => {
    const { right, head } = handsAtPeak('think');
    const chin = head.clone().add(new THREE.Vector3(0, -0.02, 0.1));
    expect(right.distanceTo(chin)).toBeLessThan(0.15);
  });

  it('comemorar: as duas mãos acima da cabeça', () => {
    const { right, left, head } = handsAtPeak('celebrate');
    expect(right.y).toBeGreaterThan(head.y + 0.15);
    expect(left.y).toBeGreaterThan(head.y + 0.15);
  });

  it('apontar: mão à frente do corpo', () => {
    expect(handsAtPeak('point').right.z).toBeGreaterThan(0.35);
  });
});
