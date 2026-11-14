import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  AmbientLight,
  EquirectangularReflectionMapping,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PMREMGenerator,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  type Scene,
  type WebGLRenderer,
} from 'three';

/** The chrome of the yo-yo and its string (v16, owner: bright enough face-on, still metal). */
export const chrome = () =>
  new MeshPhysicalMaterial({ color: 0xbfc4cc, metalness: 1, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 2.6 });

/** Half-profile of one side of the yo-yo, x = radius, y = height, for a diameter of 1. */
const PROFILE: [number, number][] = [
  [0.001, 0], [0.18, 0], [0.2, 0.06], [0.55, 0.1], [0.86, 0.2], [0.99, 0.34], [1, 0.42], [0.94, 0.5], [0.7, 0.545], [0.3, 0.555], [0.001, 0.555],
];

/**
 * The yo-yo, one unit across. `g` is placed and faced at the camera; `body` spins about the axle (its
 * local y). The logo's slit sits across both faces so the spin and the rolling read.
 */
export function makeYoyo(material = chrome()): { g: Group; body: Group } {
  const g = new Group();
  const body = new Group();
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const half = new LatheGeometry(PROFILE.map(([x, y]) => new Vector2(x * 0.5, y * 0.5)), 128);
  const a = new Mesh(half, material);
  a.position.y = 0.03;
  const b = new Mesh(half, material);
  b.scale.y = -1;
  b.position.y = -0.03;
  body.add(a, b, new Mesh(new CylinderGeometry(0.085, 0.085, 0.07, 48), material));
  const ring = new Mesh(new TorusGeometry(0.1, 0.007, 8, 64), new MeshBasicMaterial({ color: 0xe9eaec }));
  ring.rotation.x = Math.PI / 2;
  body.add(ring);
  const slitMat = new MeshPhysicalMaterial({ color: 0x0a0b0e, roughness: 0.3, clearcoat: 1 });
  for (const y of [0.31, -0.31]) {
    const slit = new Mesh(new BoxGeometry(0.62, 0.012, 0.035), slitMat);
    slit.position.y = y;
    body.add(slit);
  }
  return { g, body };
}

/** A thin chrome rod, one unit long along y: the string, scaled and turned each frame. */
export function makeString(material = chrome()): Mesh {
  return new Mesh(new CylinderGeometry(1, 1, 1, 12), material);
}

/**
 * The studio the chrome reflects: a long softbox above, a crisp strip at eye level, cold light on the left,
 * a cream bounce from the page. Drawn on a canvas, so there is no image to load. One per renderer.
 */
export function studio(renderer: WebGLRenderer, scene: Scene): void {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#16181d';
    g.fillRect(0, 0, 1024, 512);
    const bar = (x: number, y: number, w: number, h: number, color: string, blur: number) => {
      g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = color; g.fillRect(x, y, w, h); g.restore();
    };
    bar(60, 30, 900, 120, '#ffffff', 22);
    bar(380, 205, 300, 36, 'rgba(255,255,255,0.95)', 16);
    bar(0, 120, 230, 300, '#d6d9de', 34);   // cold side light, neutral (no blue)
    bar(820, 150, 204, 250, 'rgba(244,241,230,0.8)', 34);
    bar(200, 380, 620, 90, 'rgba(244,241,230,0.65)', 28);
  }
  const tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  const pm = new PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(tex).texture;
  scene.environmentIntensity = 1.9;
  pm.dispose();
  tex.dispose();
  scene.add(new AmbientLight(0xffffff, 0.15));
  const key = new DirectionalLight(0xffffff, 1.8);
  key.position.set(4, 10, 8);
  const rim = new DirectionalLight(0xffffff, 1.8);
  rim.position.set(-10, 2, -4);
  scene.add(key, rim);
}
