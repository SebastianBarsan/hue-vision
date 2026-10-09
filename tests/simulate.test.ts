import { describe, expect, it } from 'vitest';
import { CONFUSION, confusionSteps, srgbToOklab, type Vec3 } from '../src/colour';
import { simulatePixels, simulationMatrix, type SimulatedType } from '../src/simulate';

/** Simulate one 0–255 colour and return it as 0–1 sRGB. */
function simulate(rgb: Vec3, type: SimulatedType, amount: number): Vec3 {
  const data = new Uint8ClampedArray([...rgb, 255]);
  simulatePixels(data, simulationMatrix(type, amount));
  expect(data[3]).toBe(255);
  return [data[0] / 255, data[1] / 255, data[2] / 255];
}

function distance(a: Vec3, b: Vec3): number {
  const [x, y] = [srgbToOklab(a), srgbToOklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

const types: SimulatedType[] = ['protan', 'deutan', 'tritan'];

describe('simulatePixels', () => {
  it.each(types)('%s at amount 0 changes nothing', (type) => {
    const data = new Uint8ClampedArray([200, 40, 90, 255, 12, 230, 100, 128]);
    const before = [...data];
    simulatePixels(data, simulationMatrix(type, 0));
    expect([...data]).toEqual(before);
  });

  it.each(types)('%s keeps greys grey', (type) => {
    for (const v of [0, 64, 128, 255]) {
      const [r, g, b] = simulate([v, v, v], type, 1);
      expect(Math.abs(r - v / 255)).toBeLessThan(0.01);
      expect(Math.abs(g - v / 255)).toBeLessThan(0.01);
      expect(Math.abs(b - v / 255)).toBeLessThan(0.01);
    }
  });

  it.each(types)('%s brings colours on its confusion line closer as severity rises', (type) => {
    const grey: Vec3 = [0.5, 0.5, 0.5];
    const [shifted] = confusionSteps(grey, CONFUSION[type], 2, 0.3, 0.3);
    const [a, b] = [grey, shifted].map((c) => c.map((x) => Math.round(255 * x)) as unknown as Vec3);
    const gaps = [0, 0.4, 0.7, 1].map((amount) =>
      distance(simulate(a, type, amount), simulate(b, type, amount)),
    );
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThan(gaps[i - 1]);
    expect(gaps[3]).toBeLessThan(gaps[0] / 3);
  });
});
