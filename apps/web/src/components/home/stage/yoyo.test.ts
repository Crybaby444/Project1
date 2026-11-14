import { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createStage } from './scene';
import { makeYoyo, inkMaterial, yoyoLook } from './yoyo';

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

describe('yoyoLook', () => {
  it('is the logo\'s ink by default, chrome only when asked for (?yoyo=chrome), to compare', () => {
    expect(yoyoLook('')).toBe('ink');
    expect(yoyoLook('?yoyo=chrome')).toBe('chrome');
    expect(yoyoLook('?x=1&yoyo=chrome')).toBe('chrome');
    expect(yoyoLook('?yoyo=gold')).toBe('ink');
  });
});

describe('inkMaterial', () => {
  it('is flat like the logo: one unlit colour, no shading or highlights (owner: too 3D)', () => {
    const m = inkMaterial('#0a0b0e');
    expect(m).toBeInstanceOf(MeshBasicMaterial);
    expect(m.toneMapped).toBe(false); // the page's exact ink, not tone-mapped to pure black
    expect('#' + m.color.getHexString()).toBe('#0a0b0e');
  });
});

describe('makeYoyo with an edge', () => {
  it('cuts the flat yo-yo out with a thin rim in the page colour, so it parts from the letters behind', () => {
    const { body, edge } = makeYoyo(inkMaterial('#0a0b0e'), '#f4f1e6', '#f4f1e6');
    expect(edge).not.toBeNull();
    const rims = body.children.filter((c): c is Mesh => c instanceof Mesh && c.geometry.type === 'TorusGeometry' && c.material === edge);
    expect(rims.length).toBeGreaterThan(0);
  });
});
