import {
  ACESFilmicToneMapping,
  CanvasTexture,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { chrome, inkMaterial, makeString, makeYoyo, studio, yoyoLook } from './yoyo';

const { lerp, clamp } = MathUtils;
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** The page elements the stage reads every frame (all from the server-rendered home). */
export type StageDom = {
  heroSlot: HTMLElement;
  finalSlot: HTMLElement;
  finalPin: HTMLElement;
  night: HTMLElement;
  shade: HTMLElement;
  rollShadow: HTMLElement;
  letters: HTMLElement[];
};

/** What the scroll and the intro drive; the timelines write it, the frame reads it (v16 values). */
export type StageState = {
  /** Hero progress 0..1 (already scaled by HK: the hero keeps its own length inside the longer intro). */
  p: number;
  intro: number;
  drop: number;
  spinBoost: number;
  /** Progress through the pinned finale 0..1. */
  fq: number;
  rollX: number;
  rollHop: number;
  /** Pointer, −1..1. */
  px: number;
  py: number;
};

export type Stage = {
  state: StageState;
  attach(dom: StageDom): void;
  paintLetters(): void;
  resize(): void;
  frame(now: number): void;
  dispose(): void;
};

const FOV = 30;
const CZ = 20;

/** Builds the WebGL set for the home, or returns null when the browser has no WebGL (the page stays plain). */
export function createStage(canvas: HTMLCanvasElement, opts: { mobile: boolean }): Stage | null {
  const attrs = { antialias: true, alpha: true, powerPreference: 'high-performance' as const };
  const context = (canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs)) as WebGL2RenderingContext | null;
  if (!context) return null;

  const R = new WebGLRenderer({ canvas, context, ...attrs });
  R.setPixelRatio(Math.min(window.devicePixelRatio, opts.mobile ? 1.25 : 1.5));   // phones: a lighter canvas
  R.outputColorSpace = SRGBColorSpace;
  R.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  studio(R, scene);
  const cam = new PerspectiveCamera(FOV, 1, 0.1, 200);
  cam.position.set(0, 0, CZ);
  const VH = 2 * CZ * Math.tan(MathUtils.degToRad(FOV / 2));
  let W = 1, H = 1;
  const wpp = () => VH / H;

  // The logo's ink yo-yo by default; the chrome one with ?yoyo=chrome (kept to compare, owner 2026-11-14).
  const look = yoyoLook(window.location.search);
  const tone = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const mat = look === 'ink' ? inkMaterial(tone('--ink', '#0a0b0e')) : chrome();
  const slitColor = look === 'ink' ? tone('--canvas', '#f4f1e6') : 0x0a0b0e;
  const hero = makeYoyo(mat, slitColor), back = makeYoyo(mat, slitColor);
  const heroString = makeString(mat), backString = makeString(mat);
  const heroLight = new PointLight(0xffffff, 0, 0, 1.4), backLight = new PointLight(0xffffff, 0, 0, 1.4);
  scene.add(hero.g, back.g, heroString, backString, heroLight, backLight);

  type Letter = { el: HTMLElement; c: HTMLCanvasElement; tex: CanvasTexture; m: Mesh<PlaneGeometry, MeshBasicMaterial> };
  let letters: Letter[] = [];
  let dom: StageDom | null = null;
  const state: StageState = { p: 0, intro: 0, drop: 1, spinBoost: 0, fq: 0, rollX: 0, rollHop: 0, px: 0, py: 0 };
  const UP = new Vector3(0, 1, 0), dir = new Vector3();
  let ps = 0, spin = 0, backSpin = 0, last = performance.now();
  const P = { x: 0, y: 0 };

  const place = (r: DOMRect) => ({ x: (r.left + r.width / 2 - W / 2) * wpp(), y: -(r.top + r.height / 2 - H / 2) * wpp(), s: r.width * wpp(), on: r.bottom > -r.height && r.top < H + r.height });
  const hang = (s: Mesh, ax: number, ay: number, bx: number, by: number, z: number, r: number) => {
    s.position.set((ax + bx) / 2, (ay + by) / 2, z);
    s.scale.set(r, Math.max(0.001, Math.hypot(bx - ax, by - ay)), r);
    s.quaternion.setFromUnitVectors(UP, dir.set(bx - ax, by - ay, 0).normalize());
  };

  const stage: Stage = {
    state,
    attach(d) {
      dom = d;
      letters.forEach((L) => { scene.remove(L.m); L.tex.dispose(); L.m.geometry.dispose(); L.m.material.dispose(); });
      letters = d.letters.map((el) => {
        const c = document.createElement('canvas');
        const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
        const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, depthWrite: true, toneMapped: false }));
        m.renderOrder = -2; scene.add(m);
        return { el, c, tex, m };
      });
      stage.paintLetters();
    },
    /** Draws each letter of YOYO into its own texture, in the page's ink, at its DOM size. */
    paintLetters() {
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0a0b0e';
      if (look === 'ink') {
        // The ink yo-yo follows the theme like the letters: night on cream, cream in the dark.
        mat.color.set(ink);
        const cut = tone('--canvas', '#f4f1e6');
        hero.slit.color.set(cut); back.slit.color.set(cut);
      }
      letters.forEach((L) => {
        const r = L.el.getBoundingClientRect(), cs = getComputedStyle(L.el), dpr = Math.min(window.devicePixelRatio, 2);
        L.c.width = Math.max(2, Math.round(r.width * dpr)); L.c.height = Math.max(2, Math.round(r.height * dpr));
        const g = L.c.getContext('2d'); if (!g) return;
        g.scale(dpr, dpr); g.clearRect(0, 0, r.width, r.height);
        g.font = `900 ${cs.fontSize} ${cs.fontFamily}`; g.fillStyle = ink; g.textAlign = 'center';
        const mt = g.measureText(L.el.textContent ?? '');
        g.fillText(L.el.textContent ?? '', r.width / 2, r.height / 2 + (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2);
        L.tex.needsUpdate = true;
      });
    },
    resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
    },
    frame(now) {
      if (!dom) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
      P.x = lerp(P.x, state.px, 0.06); P.y = lerp(P.y, state.py, 0.06);
      ps = lerp(ps, state.p, 1 - Math.pow(0.004, dt));
      const p = ps;

      // ---- hero: hanging on its string; revs up, the night spills out of it, then it is reeled up and away
      const A = place(dom.heroSlot.getBoundingClientRect());
      const rev = smooth(0.04, 0.3, p), spill = smooth(0.2, 0.4, p), reel = smooth(0.4, 0.52, p);
      hero.g.visible = state.intro > 0.001 && reel < 0.999;
      heroLight.visible = heroString.visible = hero.g.visible;
      if (hero.g.visible) {
        const hs = A.s * 1.02 * Math.max(state.intro, 0.001), topY = VH / 2 + 1.2;
        const x = A.x + Math.sin(t * 0.9) * A.s * 0.035 * (1 - reel);
        const y = lerp(A.y + Math.sin(t * 1.6) * A.s * 0.02 * (1 - rev) + rev * A.s * 0.12, topY + hs * 0.7, Math.pow(reel, 1.5)) + state.drop * VH * 0.9;
        hero.g.position.set(x, y, 0); hero.g.scale.setScalar(hs); hero.g.lookAt(cam.position);
        if (spill < 0.999 && reel < 0.01) {
          const px = x / wpp() + W / 2, py = H / 2 - y / wpp(), r0 = hs / 2 / wpp(), R1 = Math.hypot(Math.max(px, W - px), Math.max(py, H - py)) + 20;
          dom.night.style.clipPath = spill > 0.001 ? `circle(${lerp(r0 * 0.9, R1, Math.pow(spill, 1.7))}px at ${px}px ${py}px)` : 'circle(0px at 50% 50%)';
        } else dom.night.style.clipPath = 'none';
        const sv = state.spinBoost + rev * 26 + reel * 20;
        if (sv > 0.4) spin += dt * sv; else spin += (Math.round(spin / Math.PI) * Math.PI - spin) * (1 - Math.pow(0.03, dt));
        hero.body.rotation.y = spin;
        heroLight.position.set(x - hs * 0.8, y + hs * 1.2, hs * 2.4); heroLight.intensity = 9 * hs * hs;
        hang(heroString, x, y, A.x, topY + 2, -hs * 0.06, Math.max(hs * 0.011, 0.012));
      } else if (spill > 0.5) dom.night.style.clipPath = 'none';

      // ---- the word, in the scene behind the yo-yo, exactly on its DOM letters
      const ZW = -VH * 0.4, fW = (CZ - ZW) / CZ, dark = smooth(0.26, 0.38, p);
      letters.forEach((L) => {
        const r = L.el.getBoundingClientRect();
        const rise = Math.min(1, Math.abs(Number(L.el.dataset.rise ?? 0)) / 105);
        L.m.visible = p < 0.6 && r.bottom > -50 && r.top < H + 50 && rise < 0.99 && dark < 0.99;
        if (!L.m.visible) return;
        const q = place(r);
        L.m.position.set(q.x * fW, q.y * fW, ZW);
        L.m.scale.set(r.width * wpp() * fW, r.height * wpp() * fW, 1);
        L.m.material.opacity = (1 - rise) * (1 - dark);
      });

      // ---- finale: down on its string in the dark, light out of it, the string lets go, it lands and rolls
      const F = place(dom.finalSlot.getBoundingClientRect());
      const fq = state.fq, down = smooth(0, 0.34, fq), light = smooth(0.34, 0.66, fq), loose = smooth(0.66, 0.82, fq), land = smooth(0.8, 0.9, fq);
      back.g.visible = F.on && fq > 0.001;
      backLight.visible = back.g.visible; backString.visible = back.g.visible && loose < 0.99;
      if (back.g.visible) {
        const s = F.s, topY = VH / 2 + 1.2;
        const xpx = state.rollX * Math.min(dom.finalPin.clientWidth * 0.42, 560);
        const e = 1 - Math.pow(1 - down, 3), bounce = down > 0.6 ? Math.sin(down * Math.PI * 3) * (1 - down) * 0.06 : 0;
        const x = F.x + xpx * wpp(), y = lerp(topY + s, F.y + s * 0.06 * (1 - land), e) + bounce * s + state.rollHop * s * 0.35;
        back.g.position.set(x, y, 0); back.g.scale.setScalar(s); back.g.lookAt(cam.position);
        backLight.position.set(x - s * 0.8, y + s * 1.2, s * 2.4); backLight.intensity = 9 * s * s;
        const sv = (1 - down) * 26 + (down > 0 && down < 1 ? 6 : 0);
        if (sv > 0.4) backSpin += dt * sv; else backSpin += (Math.round(backSpin / Math.PI) * Math.PI - backSpin) * (1 - Math.pow(0.03, dt));
        back.body.rotation.y = backSpin - (xpx * wpp()) / (s * 0.5);   // rolls without slipping
        if (backString.visible) { const by = topY + 2, ay = lerp(y, by, Math.pow(loose, 0.8)); hang(backString, F.x, ay, F.x, by, -s * 0.06, Math.max(s * 0.011, 0.012)); }
        const c = dom.finalPin.getBoundingClientRect(), px = x / wpp() + W / 2 - c.left, py = H / 2 - y / wpp() - c.top, r0 = s / 2 / wpp();
        const R1 = Math.hypot(Math.max(px, c.width - px), Math.max(py, c.height - py)) + 20, rr = light > 0 ? lerp(r0 * 0.9, R1, Math.pow(light, 1.7)) : 0;
        const mask = `radial-gradient(circle at ${px}px ${py}px, transparent ${rr}px, #000 ${rr + 1}px)`;
        dom.shade.style.maskImage = mask; dom.shade.style.setProperty('-webkit-mask-image', mask);
        dom.shade.style.visibility = light >= 0.999 ? 'hidden' : 'visible';
        dom.rollShadow.style.transform = `translateX(calc(-50% + ${xpx}px)) scale(${1 - state.rollHop * 0.35})`;
        dom.rollShadow.style.opacity = String(land * (1 - state.rollHop * 0.5));
      }

      cam.position.set(P.x * 0.25, P.y * 0.18, CZ); cam.lookAt(0, 0, 0);
      R.render(scene, cam);
    },
    dispose() {
      letters.forEach((L) => { L.tex.dispose(); L.m.geometry.dispose(); L.m.material.dispose(); });
      scene.traverse((o) => { if (o instanceof Mesh) { o.geometry.dispose(); } });
      mat.dispose();
      scene.environment?.dispose();
      R.dispose();
    },
  };
  return stage;
}
