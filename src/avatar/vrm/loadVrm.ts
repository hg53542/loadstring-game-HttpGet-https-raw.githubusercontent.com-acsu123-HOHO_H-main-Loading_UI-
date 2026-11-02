import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

/** Carrega um arquivo .vrm (0.x ou 1.0) de uma URL local ou blob. */
export async function loadVrm(url: string): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error('O arquivo não contém dados VRM válidos.');
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm); // VRM 0.x olha para −Z; normaliza para +Z
  vrm.scene.traverse((o) => {
    o.frustumCulled = false;
    o.castShadow = true;
  });
  return vrm;
}
