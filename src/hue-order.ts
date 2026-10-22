import { oklabToSrgb, srgbToOklab, type Vec3 } from './colour';

/*
 * Hue Order: a scale of blocks blending from one colour to another (say red
 * to yellow) is shuffled, and the player sorts it back into order against the
 * clock. Either direction counts as sorted.
 */

export const BLOCKS = 15;
export const TIME_MS = 30_000;
export const MAX_POINTS = 1000;

export interface ScaleDef {
  name: string;
  from: string;
  to: string;
}

/*
 * End colours are vivid so the 15 blocks can be spaced as far apart as the
 * screen allows: about 0.02 OKLab per step or more, roughly the smallest
 * difference people can see. Green to cyan isn't included because the screen
 * can't reach vivid enough colours in between.
 */
export const SCALES: readonly ScaleDef[] = [
  { name: 'Red → Yellow', from: '#ff1a1a', to: '#ffe600' },
  { name: 'Yellow → Green', from: '#ffe600', to: '#00b050' },
  { name: 'Cyan → Blue', from: '#00c8f0', to: '#1a40ff' },
  { name: 'Blue → Purple', from: '#0070ff', to: '#c020c0' },
  { name: 'Purple → Pink', from: '#8a2be2', to: '#ff3fa4' },
  { name: 'Magenta → Red', from: '#e020e0', to: '#ff3000' },
];

export interface Scale {
  name: string;
  /** Block colours in sorted order (sRGB, 0–1 per channel); a block's id is its index. */
  colours: Vec3[];
}

export type Rng = () => number;

function parseHex(hex: string): Vec3 {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as Vec3;
}

const inGamut = (rgb: Vec3) => rgb.every((c) => c >= -1e-9 && c <= 1 + 1e-9);

/**
 * Blend evenly from one colour to another in OKLCH (lightness, chroma and the
 * shorter way round the hue circle). Where the blend leaves the screen gamut,
 * chroma is reduced just enough to bring it back.
 */
export function blend(from: Vec3, to: Vec3, count: number): Vec3[] {
  const lch = (rgb: Vec3) => {
    const [l, a, b] = srgbToOklab(rgb);
    return [l, Math.hypot(a, b), Math.atan2(b, a)];
  };
  const [l1, c1, h1] = lch(from);
  const [l2, c2, h2] = lch(to);
  const dh = ((h2 - h1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const l = l1 + (l2 - l1) * t;
    const h = h1 + dh * t;
    const at = (c: number) => oklabToSrgb([l, c * Math.cos(h), c * Math.sin(h)]);
    let chroma = c1 + (c2 - c1) * t;
    if (!inGamut(at(chroma))) {
      let lo = 0;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + chroma) / 2;
        if (inGamut(at(mid))) lo = mid;
        else chroma = mid;
      }
      chroma = lo;
    }
    return at(chroma).map((c) => Math.min(1, Math.max(0, c))) as unknown as Vec3;
  });
}

export function css([r, g, b]: Vec3): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

/** A random scale, different from `previous` when one is given. */
export function makeScale(rng: Rng, previous?: string): Scale {
  const choices = SCALES.filter((s) => s.name !== previous);
  const def = choices[Math.floor(rng() * choices.length)];
  return { name: def.name, colours: blend(parseHex(def.from), parseHex(def.to), BLOCKS) };
}

/**
 * Pairs of side-by-side blocks that are also next to each other in the
 * sorted scale. A fully sorted order, either way round, has BLOCKS - 1.
 */
export function correctNeighbours(order: readonly number[]): number {
  let count = 0;
  for (let i = 1; i < order.length; i++) if (Math.abs(order[i] - order[i - 1]) === 1) count++;
  return count;
}

export function isSorted(order: readonly number[]): boolean {
  return correctNeighbours(order) === order.length - 1;
}

/** Most correct neighbours a fresh shuffle may have, so it always needs real work. */
const MAX_START_NEIGHBOURS = 2;

/** A random order of the block indices 0..BLOCKS-1 that is far from sorted. */
export function shuffled(rng: Rng): number[] {
  for (;;) {
    const order = Array.from({ length: BLOCKS }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (correctNeighbours(order) <= MAX_START_NEIGHBOURS) return order;
  }
}

/** Take the block at `from` out and put it back in at `to`. */
export function move(order: readonly number[], from: number, to: number): number[] {
  const next = [...order];
  const [block] = next.splice(from, 1);
  next.splice(to, 0, block);
  return next;
}

export function swap(order: readonly number[], a: number, b: number): number[] {
  const next = [...order];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Share of the points for getting the order right; the rest rewards speed. */
const ACCURACY_POINTS = 700;
/** Sorting within this long still earns the full time bonus. */
export const PERFECT_MS = 5_000;

/**
 * Points out of MAX_POINTS. A sorted scale scores ACCURACY_POINTS plus a time
 * bonus of up to the remaining points, all of it when sorted within
 * PERFECT_MS. An unsorted one scores ACCURACY_POINTS times its share of
 * correct neighbours.
 */
export function score(order: readonly number[], msLeft: number): number {
  if (isSorted(order)) {
    const bonus = Math.min(1, Math.max(0, msLeft / (TIME_MS - PERFECT_MS)));
    return Math.round(ACCURACY_POINTS + (MAX_POINTS - ACCURACY_POINTS) * bonus);
  }
  return Math.round((ACCURACY_POINTS * correctNeighbours(order)) / (order.length - 1));
}
