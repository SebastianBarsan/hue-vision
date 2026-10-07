import { describe, expect, it } from 'vitest';
import { lmsToSrgb, srgbToHsl, srgbToLms, tritanSteps, type Vec3 } from '../src/colour';
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

describe('tritanSteps', () => {
  const steps = tritanSteps(background, 20, 18, 0.06);
  const [l0, m0, s0] = srgbToLms(background);

  it('only change the S-cone signal', () => {
    for (const step of steps) {
      const [l, m] = srgbToLms(step);
      expect(l / l0).toBeCloseTo(1, 6);
      expect(m / m0).toBeCloseTo(1, 6);
    }
  });

  it('fall geometrically from the largest to the smallest contrast', () => {
    const contrasts = steps.map((step) => srgbToLms(step)[2] / s0 - 1);
    expect(contrasts[0]).toBeCloseTo(18, 6);
    expect(contrasts.at(-1)).toBeCloseTo(0.06, 6);
    for (let i = 1; i < contrasts.length; i++) {
      expect(contrasts[i] / contrasts[i - 1]).toBeCloseTo(contrasts[1] / contrasts[0], 6);
    }
  });

  it('stay within the screen gamut', () => {
    for (const step of steps) {
      for (const c of step) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('blue-yellow suite', () => {
  it('has one 20-level subtest', () => {
    expect(BLUE_YELLOW.subtests).toHaveLength(1);
    expect(BLUE_YELLOW.subtests[0].steps).toHaveLength(20);
  });
});
