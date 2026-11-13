import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { createStage } from './scene';
import { makeYoyo } from './yoyo';

describe('makeYoyo', () => {
  it('is two lathe halves, an axle, and the logo slit on both faces', () => {
    const { g, body } = makeYoyo();
    expect(g.children).toContain(body);
    const meshes = body.children.filter((c): c is Mesh => c instanceof Mesh);
    expect(meshes.filter((m) => m.geometry.type === 'LatheGeometry')).toHaveLength(2);
    const slits = meshes.filter((m) => m.geometry.type === 'BoxGeometry');
    expect(slits.map((m) => m.position.y).sort()).toEqual([-0.31, 0.31]);
  });
});

describe('createStage', () => {
  it('steps aside when the browser has no WebGL, so the page stays plain', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => null) as typeof canvas.getContext;
    expect(createStage(canvas, { mobile: false })).toBeNull();
  });
});
