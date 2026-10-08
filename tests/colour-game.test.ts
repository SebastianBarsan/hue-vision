import { describe, expect, it } from 'vitest';
import {
  css,
  difference,
  hsbToSrgb,
  MAX_POINTS,
  randomColour,
  score,
  verdict,
  type Hsb,
} from '../src/colour-game';

/** Deterministic pseudo-random generator so tests are repeatable. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe('hsbToSrgb', () => {
  it.each([
    [{ h: 0, s: 100, b: 100 }, [1, 0, 0]],
    [{ h: 120, s: 100, b: 100 }, [0, 1, 0]],
    [{ h: 240, s: 100, b: 50 }, [0, 0, 0.5]],
    [{ h: 60, s: 100, b: 100 }, [1, 1, 0]],
    [{ h: 300, s: 0, b: 40 }, [0.4, 0.4, 0.4]],
    [{ h: 360, s: 100, b: 100 }, [1, 0, 0]],
  ] as const)('%j → %j', (hsb, rgb) => {
    hsbToSrgb(hsb).forEach((c, i) => expect(c).toBeCloseTo(rgb[i], 9));
  });

  it('gives CSS colours in 0–255', () => {
    expect(css({ h: 30, s: 100, b: 100 })).toBe('rgb(255 128 0)');
  });
});

describe('randomColour', () => {
  it('stays in range and avoids greys and near-black', () => {
    const rng = seeded();
    for (let i = 0; i < 500; i++) {
      const { h, s, b } = randomColour(rng);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
      for (const v of [s, b]) {
        expect(v).toBeGreaterThanOrEqual(25);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('score', () => {
  const target: Hsb = { h: 200, s: 70, b: 60 };

  it('gives full marks for an exact match', () => {
    expect(score(target, target)).toBe(MAX_POINTS);
  });

  it('treats hue 0 and 360 as the same colour', () => {
    expect(score({ h: 0, s: 80, b: 80 }, { h: 360, s: 80, b: 80 })).toBe(MAX_POINTS);
  });

  it('falls as the guess moves further away', () => {
    const points = [0, 5, 15, 40, 90].map((dh) => score(target, { ...target, h: target.h + dh }));
    for (let i = 1; i < points.length; i++) expect(points[i]).toBeLessThan(points[i - 1]);
    expect(points.at(-1)).toBeLessThan(100);
  });

  it('is symmetric', () => {
    const guess: Hsb = { h: 180, s: 40, b: 80 };
    expect(difference(target, guess)).toBeCloseTo(difference(guess, target), 12);
  });

  it('scores between 0 and 1000', () => {
    const points = score({ h: 0, s: 100, b: 100 }, { h: 180, s: 0, b: 0 });
    expect(points).toBeGreaterThanOrEqual(0);
    expect(points).toBeLessThan(10);
  });
});

describe('verdict', () => {
  it.each([
    [1000, 'Perfect recall!'],
    [850, 'Excellent!'],
    [650, 'Close!'],
    [400, 'Not bad'],
    [10, 'Way off'],
  ])('%i → %s', (points, text) => {
    expect(verdict(points)).toBe(text);
  });
});
