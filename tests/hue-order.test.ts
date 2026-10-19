import { describe, expect, it } from 'vitest';
import { srgbToOklab, type Vec3 } from '../src/colour';
import {
  BLOCKS,
  blend,
  correctNeighbours,
  isSorted,
  makeScale,
  MAX_POINTS,
  move,
  PERFECT_MS,
  score,
  SCALES,
  shuffled,
  swap,
  TIME_MS,
} from '../src/hue-order';

/** Deterministic pseudo-random generator so tests are repeatable. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

const sorted = Array.from({ length: BLOCKS }, (_, i) => i);

/** Always picks the first remaining choice. */
const first = () => 0;

describe.each(SCALES.map((def) => [def.name, def] as const))('%s scale', (name) => {
  const scale = makeScale(() => SCALES.findIndex((s) => s.name === name) / SCALES.length + 1e-9);
  const lab = scale.colours.map(srgbToOklab);
  const steps = lab.slice(1).map((c, i) => Math.hypot(...c.map((v, k) => v - lab[i][k])));

  it(`has ${BLOCKS} blocks inside the screen gamut`, () => {
    expect(scale.name).toBe(name);
    expect(scale.colours).toHaveLength(BLOCKS);
    for (const colour of scale.colours) {
      for (const c of colour) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has visible, roughly even steps', () => {
    for (const step of steps) {
      expect(step).toBeGreaterThan(0.018);
      expect(step).toBeLessThan(Math.min(...steps) * 2.5);
    }
  });
});

describe('blend', () => {
  it('starts and ends at the given colours', () => {
    const from: Vec3 = [1, 0.1, 0.1];
    const to: Vec3 = [1, 0.9, 0];
    const colours = blend(from, to, 5);
    colours[0].forEach((c, i) => expect(c).toBeCloseTo(from[i], 6));
    colours[4].forEach((c, i) => expect(c).toBeCloseTo(to[i], 6));
  });
});

describe('makeScale', () => {
  it('never repeats the previous scale', () => {
    expect(makeScale(first).name).toBe(SCALES[0].name);
    expect(makeScale(first, SCALES[0].name).name).toBe(SCALES[1].name);
  });
});

describe('ordering', () => {
  it('counts sorted orders either way round as sorted', () => {
    expect(isSorted(sorted)).toBe(true);
    expect(isSorted([...sorted].reverse())).toBe(true);
    expect(correctNeighbours(sorted)).toBe(BLOCKS - 1);
  });

  it('counts correct neighbours in a partly sorted order', () => {
    // Two sorted halves joined the wrong way: only the join is wrong.
    expect(correctNeighbours([7, 8, 9, 10, 11, 12, 13, 14, 0, 1, 2, 3, 4, 5, 6])).toBe(13);
    expect(isSorted([7, 8, 9, 10, 11, 12, 13, 14, 0, 1, 2, 3, 4, 5, 6])).toBe(false);
  });

  it('shuffles every block into a far-from-sorted order', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const order = shuffled(rng);
      expect([...order].sort((a, b) => a - b)).toEqual(sorted);
      expect(correctNeighbours(order)).toBeLessThanOrEqual(2);
    }
  });

  it('moves and swaps blocks without changing the original', () => {
    const order = [0, 1, 2, 3];
    expect(move(order, 0, 2)).toEqual([1, 2, 0, 3]);
    expect(move(order, 3, 1)).toEqual([0, 3, 1, 2]);
    expect(swap(order, 0, 3)).toEqual([3, 1, 2, 0]);
    expect(order).toEqual([0, 1, 2, 3]);
  });
});

describe('score', () => {
  it('gives 700 plus a time bonus for a sorted scale', () => {
    expect(score(sorted, TIME_MS)).toBe(MAX_POINTS);
    expect(score(sorted, TIME_MS - PERFECT_MS)).toBe(MAX_POINTS);
    expect(score(sorted, TIME_MS - PERFECT_MS - 1000)).toBe(988);
    expect(score(sorted, (TIME_MS - PERFECT_MS) / 2)).toBe(850);
    expect(score([...sorted].reverse(), 0)).toBe(700);
  });

  it('gives a share of 700 for an unsorted one', () => {
    const order = [7, 8, 9, 10, 11, 12, 13, 14, 0, 1, 2, 3, 4, 5, 6];
    expect(score(order, TIME_MS)).toBe(650);
    expect(score([0, 2, 4, 6, 8, 10, 12, 14, 1, 3, 5, 7, 9, 11, 13], 0)).toBe(0);
  });
});
