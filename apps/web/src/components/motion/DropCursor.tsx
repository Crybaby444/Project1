'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { hoverTarget, spring, stepSpring, stepTail, stretch, type HoverTarget, type Point } from './cursor-physics';
import { moved } from './drop-cursor';
import { useReducedMotion } from './hooks';

const TAIL = 6;
const FINE = '(pointer: fine)';
function subscribeFine(onChange: () => void): () => void {
  const q = window.matchMedia?.(FINE);
  q?.addEventListener?.('change', onChange);
  return () => q?.removeEventListener?.('change', onChange);
}
const subscribeNone = () => () => {};
const CLICKABLE =
  'a[href], button:not([disabled]), [role="button"], [role="combobox"], [role="option"]:not([aria-disabled="true"]), [role="tab"], summary, label[for]';
/** Over these the native caret shows and the drop steps aside. */
const TYPING = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
// One signed-distance field: the stretched drop melted (smooth-min) into its tapering tail, morphing into the
// hovered element's rounded box, or a ring over something too big; plus the click's ripple.
const FRAG = `precision highp float;
uniform float uDpr; uniform vec4 uHead; uniform vec2 uStr; uniform vec3 uTail[${TAIL}];
uniform vec4 uBox; uniform float uBoxR; uniform float uHover; uniform float uRing; uniform vec4 uRip; uniform float uA;
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 p = gl_FragCoord.xy;
  vec2 d = p - uHead.xy; float c = cos(uHead.w), s = sin(uHead.w);
  vec2 q = vec2(c * d.x + s * d.y, -s * d.x + c * d.y) / uStr;
  float drop = (length(q) - uHead.z) * min(uStr.x, uStr.y);
  // The tail is drawn as tapered capsules from the head through each droplet: one connected stream.
  vec3 prev = vec3(uHead.xy, uHead.z * 0.9);
  for (int i = 0; i < ${TAIL}; i++) {
    vec3 t = uTail[i];
    vec2 ba = t.xy - prev.xy, pa = p - prev.xy;
    float hh = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-3), 0.0, 1.0);
    drop = smin(drop, length(pa - ba * hh) - mix(prev.z, t.z, hh), 14.0 * uDpr);
    prev = t;
  }
  float box = sdBox(p - uBox.xy, uBox.zw, uBoxR);
  float shape = mix(drop, smin(box, drop, 12.0 * uDpr), uHover);
  float ring = min(abs(length(d) - 24.0 * uDpr) - 1.4 * uDpr, length(d) - 3.0 * uDpr);
  shape = mix(shape, ring, uRing);
  float a = clamp(0.5 - shape, 0.0, 1.0);
  float rip = abs(length(p - uRip.xy) - uRip.z) - 1.2 * uDpr;
  a = max(a, clamp(0.5 - rip, 0.0, 1.0) * uRip.w) * uA;
  gl_FragColor = vec4(vec3(0.957, 0.945, 0.902) * a, a);
}`;

/** The element's corner radius in px (a pill's huge radius is clamped to half its height). */
function radiusOf(el: Element): number {
  const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
  return Number.isFinite(r) ? r : 0;
}

/**
 * The cursor (v16): a drop of ink that inverts whatever it is under (mix-blend-mode: difference). It
 * follows the pointer on a spring with a little overshoot, stretches along its motion (keeping its
 * area) and pulls a liquid tail; over anything clickable it is drawn in and pours into the element's
 * own shape with an elastic plop (only the words of a wide label or link; a ring over a whole card); a
 * click squashes it and sends a ripple; over a text field it steps aside for the caret. Only for a
 * mouse or trackpad, never with reduced motion or under automation; it draws only while something moves.
 */
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
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (name: string) => gl.getUniformLocation(prog, name);
    const u = { dpr: U('uDpr'), head: U('uHead'), str: U('uStr'), tail: U('uTail'), box: U('uBox'), boxR: U('uBoxR'), hover: U('uHover'), ring: U('uRing'), rip: U('uRip'), a: U('uA') };

    // Uniform state as one array, so a frame that changes nothing is skipped (moved()).
    const frameData = new Float32Array(4 + 2 + TAIL * 3 + 4 + 1 + 1 + 1 + 4 + 1);
    const drawn = new Float32Array(frameData.length).fill(-1e9);
    let dpr = 1, H = 0;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      H = c.clientHeight;
      c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(H * dpr);
      gl.viewport(0, 0, c.width, c.height);
      drawn.fill(-1e9);
      wake();
    };

    // Everything the frame animates.
    const pointer: Point = { x: -200, y: -200 };
    const hx = spring(-200), hy = spring(-200);
    const tail: Point[] = Array.from({ length: TAIL }, () => ({ x: -200, y: -200 }));
    const alpha = spring(0), hover = spring(0), ring = spring(0), plop = spring(0), squash = spring(1);
    let alphaTarget = 0;
    let el: Element | null = null, elRadius = 0, typing = false;
    let target: HoverTarget | null = null;
    const box = { cx: -200, cy: -200, hw: 0, hh: 0, r: 0 };
    const rip = { x: 0, y: 0, t: 1 };
    let angle = 0;
    const range = document.createRange();
    let raf = 0, last = performance.now(), running = false;

    /** The words of a label or link (or its [data-cursor-text]), for a wide element. */
    const textRect = (node: Element): DOMRect | null => {
      const words = node.querySelector('[data-cursor-text]') ?? node;
      if (!words.textContent?.trim()) return null;
      range.selectNodeContents(words);
      return range.getBoundingClientRect();
    };
    const pick = (node: EventTarget | null) => {
      const e = node instanceof Element ? node : null;
      typing = !!e?.closest(TYPING);
      const next = typing ? null : (e?.closest(CLICKABLE) ?? null);
      if (next !== el) {
        el = next;
        elRadius = el ? radiusOf(el) : 0;
        if (el) { plop.x = 0; plop.v = 0; }
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (el && !el.isConnected) el = null;

      // Where the drop wants to be: the pointer, drawn a little towards the middle of what it pours into.
      target = el ? hoverTarget(el.getBoundingClientRect(), textRect(el), elRadius) : null;
      let tx = pointer.x, ty = pointer.y;
      if (target) { tx += (target.cx - pointer.x) * 0.22; ty += (target.cy - pointer.y) * 0.22; }
      stepSpring(hx, tx, dt, 900, 0.72);
      stepSpring(hy, ty, dt, 900, 0.72);
      stepTail(tail, { x: hx.x, y: hy.x }, dt);

      stepSpring(alpha, typing ? 0 : alphaTarget, dt, 260, 1);
      stepSpring(hover, target?.kind === 'box' ? 1 : 0, dt, 420, 0.62);
      stepSpring(ring, target?.kind === 'ring' ? 1 : 0, dt, 380, 0.7);
      stepSpring(plop, target?.kind === 'box' ? 1 : 0, dt, 520, 0.42);
      stepSpring(squash, 1, dt, 600, 0.32);
      rip.t = Math.min(1, rip.t + dt / 0.5);

      if (target?.kind === 'box') {
        // The box grows out of the drop with an elastic overshoot, then follows the element.
        const k = Math.max(0, plop.x);
        const m = Math.min(1, k);
        box.cx = hx.x + (target.cx - hx.x) * m; box.cy = hy.x + (target.cy - hy.x) * m;
        box.hw = target.hw * k; box.hh = target.hh * k; box.r = Math.min(target.r, target.hh) * k;
      }

      const speed = Math.hypot(hx.v, hy.v);
      if (speed > 30) angle = Math.atan2(-hy.v, hx.v);
      const h = Math.max(0, Math.min(1, hover.x));
      const st = stretch(speed * (1 - h));
      const r = 9 * Math.max(0.3, squash.x) * (1 - 0.55 * h);
      const G = (y: number) => (H - y) * dpr;
      let o = 0;
      frameData.set([hx.x * dpr, G(hy.x), r * dpr, angle], o); o += 4;
      frameData.set([st.along, st.across], o); o += 2;
      tail.forEach((d, i) => { frameData.set([d.x * dpr, G(d.y), r * dpr * Math.pow(0.8, i + 1)], o); o += 3; });
      frameData.set([box.cx * dpr, G(box.cy), Math.max(0, box.hw) * dpr, Math.max(0, box.hh) * dpr], o); o += 4;
      frameData[o++] = Math.max(0, box.r) * dpr;
      frameData[o++] = Math.max(0, Math.min(1.2, hover.x));
      frameData[o++] = Math.max(0, Math.min(1, ring.x));
      const e = 1 - Math.pow(1 - rip.t, 3);
      frameData.set([rip.x * dpr, G(rip.y), (6 + 40 * e) * dpr, rip.t < 1 ? 0.9 * (1 - rip.t) : 0], o); o += 4;
      frameData[o++] = Math.max(0, Math.min(1, alpha.x));

      if (!moved(drawn, frameData, 0.02)) {
        // Nothing moved: sleep until the pointer, a click or a scroll wakes the drop.
        running = false;
        return;
      }
      let i = 0;
      gl.uniform1f(u.dpr, dpr);
      gl.uniform4f(u.head, frameData[i]!, frameData[i + 1]!, frameData[i + 2]!, frameData[i + 3]!); i += 4;
      gl.uniform2f(u.str, frameData[i]!, frameData[i + 1]!); i += 2;
      gl.uniform3fv(u.tail, frameData.subarray(i, i + TAIL * 3)); i += TAIL * 3;
      gl.uniform4f(u.box, frameData[i]!, frameData[i + 1]!, frameData[i + 2]!, frameData[i + 3]!); i += 4;
      gl.uniform1f(u.boxR, frameData[i++]!);
      gl.uniform1f(u.hover, frameData[i++]!);
      gl.uniform1f(u.ring, frameData[i++]!);
      gl.uniform4f(u.rip, frameData[i]!, frameData[i + 1]!, frameData[i + 2]!, frameData[i + 3]!); i += 4;
      gl.uniform1f(u.a, frameData[i++]!);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawn.set(frameData);
      raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (running) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; alphaTarget = 1; pick(e.target); wake(); };
    const onOver = (e: PointerEvent) => { pick(e.target); wake(); };
    const onLeave = () => { alphaTarget = 0; wake(); };
    const onDown = (e: PointerEvent) => { squash.v -= 9; rip.x = e.clientX; rip.y = e.clientY; rip.t = 0; wake(); };
    const onScroll = () => wake();
    document.body.classList.add('has-cursor');
    size();
    addEventListener('resize', size);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerover', onOver, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('has-cursor');
      removeEventListener('resize', size);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerover', onOver);
      removeEventListener('pointerdown', onDown);
      removeEventListener('scroll', onScroll, { capture: true });
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
