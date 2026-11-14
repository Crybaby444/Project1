'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { fillPoints, headRadius, moved } from './drop-cursor';
import { useReducedMotion } from './hooks';

const TAIL = 11;
const FILL = 5;
const N = TAIL + FILL;
const FINE = '(pointer: fine)';
function subscribeFine(onChange: () => void): () => void {
  const q = window.matchMedia?.(FINE);
  q?.addEventListener?.('change', onChange);
  return () => q?.removeEventListener?.('change', onChange);
}
const CLICKABLE = 'a[href], button:not([disabled]), [role="button"], summary, label[for]';

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
const FRAG = `precision highp float; uniform vec3 uP[${N}]; uniform float uA;
void main(){ vec2 p = gl_FragCoord.xy; float f = 0.0;
  for (int i = 0; i < ${N}; i++) { vec2 d = p - uP[i].xy; f += uP[i].z * uP[i].z / (dot(d, d) + 1.0); }
  float a = smoothstep(0.9, 1.1, f) * uA; gl_FragColor = vec4(vec3(0.957, 0.945, 0.902) * a, a); }`;

/**
 * The cursor (v16): a drop of ink that inverts whatever it is over (mix-blend-mode: difference). Small at
 * rest; speed swells it and pulls a liquid tail; over anything clickable it is drawn to the element and
 * spills over it with an elastic plop; a click splashes. Only for a mouse or trackpad, never with
 * reduced motion; touch screens keep their own behaviour.
 */
const subscribeNone = () => () => {};

export function DropCursor() {
  const fine = useSyncExternalStore(subscribeFine, () => window.matchMedia?.(FINE).matches === true, () => false);
  const reduce = useReducedMotion();
  // Under automation (navigator.webdriver) there is no GPU: the shader would starve the tests beside it.
  const automated = useSyncExternalStore(subscribeNone, () => navigator.webdriver === true, () => false);
  const on = fine && !reduce && !automated;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!on || !c) return;
    const gl = c.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return;
    const shader = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uP = gl.getUniformLocation(prog, 'uP'), uA = gl.getUniformLocation(prog, 'uA');

    document.body.classList.add('has-cursor');
    const pts = new Float32Array(N * 3);
    const drawn = new Float32Array(N * 3).fill(-1e9);
    let drawnA = -1;
    const tail = Array.from({ length: TAIL }, () => ({ x: -200, y: -200 }));
    const fill = Array.from({ length: FILL }, () => ({ x: -200, y: -200 }));
    const range = document.createRange();
    const s = { x: -200, y: -200, px: -200, py: -200, speed: 0, a: 0, ta: 0, hover: 0, plop: 0, plopV: 0, burst: 0, el: null as Element | null };

    const size = () => { c.width = c.clientWidth; c.height = c.clientHeight; gl.viewport(0, 0, c.width, c.height); drawn.fill(-1e9); };
    size();
    const onMove = (e: PointerEvent) => { s.x = e.clientX; s.y = e.clientY; s.ta = 1; };
    const onLeave = () => { s.ta = 0; };
    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE) ?? null;
      if (el !== s.el) { s.el = el; if (el) { s.plop = 0; s.plopV = 0; } }
    };
    const onDown = () => { s.burst = 1; };
    addEventListener('resize', size);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerover', onOver, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      s.a += (s.ta - s.a) * Math.min(1, dt * 10);
      s.speed += (Math.hypot(s.x - s.px, s.y - s.py) / Math.max(dt, 1e-3) - s.speed) * 0.18; s.px = s.x; s.py = s.y;
      s.hover += ((s.el ? 1 : 0) - s.hover) * Math.min(1, dt * 9);
      // the plop: a springy 0 → 26 that overshoots and settles, like elastic.out
      const target = s.el ? 26 : 0; s.plopV += ((target - s.plop) * 170 - s.plopV * 11) * dt; s.plop += s.plopV * dt;
      s.burst *= Math.pow(0.004, dt);
      if (s.el && !s.el.isConnected) s.el = null;

      let hx = s.x, hy = s.y, box: DOMRect | null = null;
      if (s.el && s.hover > 0.01) {
        const name = s.el.querySelector('[data-cursor-text]');
        if (name) { range.selectNodeContents(name); box = range.getBoundingClientRect(); } else box = s.el.getBoundingClientRect();
        hx += (box.left + box.width / 2 - hx) * 0.35 * s.hover; hy += (box.top + box.height / 2 - hy) * 0.35 * s.hover;
      }
      const head = headRadius(s.speed, s.hover, s.burst);
      const stretch = Math.min(1, s.speed / 1200 + 0.2);
      tail.forEach((b, i) => { const t = i ? tail[i - 1]! : { x: hx, y: hy }; const k = i ? 0.6 : 0.55; b.x += (t.x - b.x) * k; b.y += (t.y - b.y) * k; });
      tail.forEach((b, i) => { pts[i * 3] = b.x; pts[i * 3 + 1] = c.height - b.y; pts[i * 3 + 2] = i ? head * Math.pow(0.9, i) * stretch : head; });
      const spread = box ? fillPoints(box, FILL, s.hover, Math.max(0, s.plop)) : null;
      fill.forEach((b, j) => {
        const t = spread ? spread[j]! : { x: hx, y: hy, r: 0 };
        b.x += (hx + (t.x - hx) * s.hover - b.x) * 0.3; b.y += (hy + (t.y - hy) * s.hover - b.y) * 0.3;
        const k = (TAIL + j) * 3; pts[k] = b.x; pts[k + 1] = c.height - b.y; pts[k + 2] = t.r;
      });
      // A still cursor keeps its last frame: no full-screen shader pass until something moves.
      if (moved(drawn, pts) || Math.abs(s.a - drawnA) > 0.002) {
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform3fv(uP, pts); gl.uniform1f(uA, s.a); gl.drawArrays(gl.TRIANGLES, 0, 3);
        drawn.set(pts); drawnA = s.a;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('has-cursor');
      removeEventListener('resize', size);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerover', onOver);
      removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [on]);

  if (!on) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full mix-blend-difference"
    />
  );
}
