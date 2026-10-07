import { describe, expect, it } from 'vitest';
import { CONFUSION, confusionSteps, lmsToSrgb, srgbToHsl, srgbToLms, type Vec3 } from '../src/colour';
import { BLUE_YELLOW_SUBTEST, STEPS, SUBTESTS } from '../src/levels';
import { BLUE_YELLOW } from '../src/suites';

const background: Vec3 = [0.6, 0.62, 0.03];

describe('LMS conversion', () => {
  it('round-trips sRGB', () => {
    const back = lmsToSrgb(srgbToLms(background));
    back.forEach((c, i) => expect(c).toBeCloseTo(background[i], 6));
  });
});

describe('srgbToHsl', () => {
  it.each([
    [[1, 0, 0], [0, 100, 50]],
    [[0, 0, 1], [240, 100, 50]],
    [[0.5, 0.5, 0.5], [0, 0, 50]],
    [[1, 1, 0], [60, 100, 50]],
  ] as const)('%j → %j', (rgb, hsl) => {
    expect(srgbToHsl(rgb)).toEqual(hsl);
  });
});

describe('confusionSteps', () => {
  it.each(Object.entries(CONFUSION))('%s steps scale each cone by its direction', (_, direction) => {
    const start = srgbToLms(background);
    const steps = confusionSteps(background, direction, 5, 0.3, 0.01);
    const first = srgbToLms(steps[0]);
    first.forEach((c, i) => expect(c / start[i]).toBeCloseTo(1 + 0.3 * direction[i], 6));
  });

  it('fall geometrically from the largest to the smallest contrast', () => {
    const [, , s0] = srgbToLms(background);
    const steps = confusionSteps(background, CONFUSION.tritan, 20, 18, 0.06);
    const contrasts = steps.map((step) => srgbToLms(step)[2] / s0 - 1);
    expect(contrasts[0]).toBeCloseTo(18, 6);
    expect(contrasts.at(-1)).toBeCloseTo(0.06, 6);
    for (let i = 1; i < contrasts.length; i++) {
      expect(contrasts[i] / contrasts[i - 1]).toBeCloseTo(contrasts[1] / contrasts[0], 6);
    }
  });
});

/** HSL in CSS units back to sRGB (0–1 per channel). */
function hslToSrgb([h, s, l]: readonly number[]): Vec3 {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

describe.each([...SUBTESTS, BLUE_YELLOW_SUBTEST].map((t) => [t.name, t] as const))('%s subtest', (_, subtest) => {
  it(`has ${STEPS} levels`, () => {
    expect(subtest.steps).toHaveLength(STEPS);
  });

  it('stays within the screen gamut', () => {
    for (const step of subtest.steps) {
      const [, s, l] = step;
      expect(s).toBeLessThanOrEqual(100);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(100);
    }
  });

  it('gets closer to the background at every level', () => {
    const bg = srgbToLms(hslToSrgb(subtest.background));
    const distance = (hsl: readonly number[]) =>
      Math.hypot(...srgbToLms(hslToSrgb(hsl)).map((c, i) => c / bg[i] - 1));
    const distances = subtest.steps.map(distance);
    for (let i = 1; i < distances.length; i++) expect(distances[i]).toBeLessThan(distances[i - 1]);
  });

  it('still differs from the background on an 8-bit screen at the last level', () => {
    const to8bit = (hsl: readonly number[]) => hslToSrgb(hsl).map((c) => Math.round(c * 255));
    expect(to8bit(subtest.steps.at(-1)!)).not.toEqual(to8bit(subtest.background));
  });
});

describe('blue-yellow suite', () => {
  it('has one subtest', () => {
    expect(BLUE_YELLOW.subtests).toEqual([BLUE_YELLOW_SUBTEST]);
  });
});
