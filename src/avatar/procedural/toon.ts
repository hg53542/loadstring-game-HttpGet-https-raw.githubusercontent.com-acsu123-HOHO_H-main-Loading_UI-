import * as THREE from 'three';

/**
 * Estilo anime (cel shading) para o modelo provisório:
 *  - sombra em faixas (gradientMap com poucos tons e filtro "nearest");
 *  - contorno preto pelo método "casco invertido": uma cópia da malha, empurrada
 *    para fora ao longo das normais e desenhada só pelo lado de trás.
 * Tudo em código, sem assets externos.
 */

/** Mapa de tons: 3 faixas (sombra, meio-tom, luz). Funciona sem DOM. */
export function createToonGradient(): THREE.DataTexture {
  const tones = [110, 190, 255];
  const data = new Uint8Array(tones.length * 4);
  tones.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const tex = new THREE.DataTexture(data, tones.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export const OUTLINE_COLOR = '#1b1018';

/** Material de contorno com espessura constante em metros (independe do tamanho da peça). */
export function createOutlineMaterial(thickness = 0.0035, color = OUTLINE_COLOR): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: thickness },
      color: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        // Espessura em espaço de mundo: compensa a escala do objeto.
        vec3 n = normalize(normalMatrix * normal);
        vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
        viewPos.xyz += n * thickness;
        gl_Position = projectionMatrix * viewPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() { gl_FragColor = vec4(color, 1.0); }
    `,
    side: THREE.BackSide,
  });
}

/**
 * Cabeça estilo anime: a partir de uma esfera, afina o queixo em "V"
 * e achata a frente do rosto. `surfaceZ` usa a mesma fórmula para colar
 * olhos, boca e marcas exatamente na pele.
 */
export const HEAD_R = 0.12;

const sxAt = (y: number) => {
  const t = Math.max(0, -y / HEAD_R);
  return 0.95 * (1 - 0.36 * Math.pow(t, 1.5));
};
const szFrontAt = (y: number) => {
  const t = Math.max(0, -y / HEAD_R);
  return 0.9 * (1 + 0.08 * t);
};

export function createAnimeHeadGeometry(): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(HEAD_R, 40, 30);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const z = p.getZ(i);
    p.setX(i, p.getX(i) * sxAt(y));
    p.setZ(i, z > 0 ? z * szFrontAt(y) : z * 1.02);
    // Queixo levemente pontudo.
    if (y < -HEAD_R * 0.6) p.setY(i, y * (1 + 0.08 * ((-y / HEAD_R - 0.6) / 0.4)));
  }
  g.computeVertexNormals();
  return g;
}

/** Profundidade (z) da superfície frontal da cabeça no ponto (x, y). */
export function surfaceZ(x: number, y: number): number {
  const x0 = x / sxAt(y);
  const r2 = HEAD_R * HEAD_R - x0 * x0 - y * y;
  return r2 > 0 ? Math.sqrt(r2) * szFrontAt(y) : 0;
}
