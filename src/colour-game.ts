import { srgbToOklab, type Vec3 } from './colour';

/*
 * Colour Recall: a colour is shown for a few seconds, then hidden, and the
 * player recreates it from memory with hue, saturation and brightness sliders.
 */

export const MEMORISE_MS = 5_000;
export const ADJUST_MS = 20_000;
/** How long the one hint per colour shows the target. */
export const HINT_MS = 300;
export const MAX_POINTS = 1000;

/** Hue in degrees (0–360), saturation and brightness from 0 to 100. */
export interface Hsb {
  h: number;
  s: number;
  b: number;
}

/** Where the sliders start each round. */
export const START: Hsb = { h: 180, s: 50, b: 50 };

export type Rng = () => number;

/**
 * A random target. Saturation and brightness stay above 25 so the target is
 * never so grey or dark that its hue can't be seen.
 */
export function randomColour(rng: Rng): Hsb {
  return {
    h: Math.floor(rng() * 360),
    s: 25 + Math.floor(rng() * 76),
    b: 25 + Math.floor(rng() * 76),
  };
}

/** HSB (also called HSV) to sRGB, 0–1 per channel. */
export function hsbToSrgb({ h, s, b }: Hsb): Vec3 {
  const v = b / 100;
  const c = v * (s / 100);
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - c * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

export function css(colour: Hsb): string {
  const [r, g, b] = hsbToSrgb(colour).map((c) => Math.round(c * 255));
  return `rgb(${r} ${g} ${b})`;
}

/** Perceptual distance between two colours (Euclidean distance in OKLab). */
export function difference(a: Hsb, b: Hsb): number {
  const [l1, a1, b1] = srgbToOklab(hsbToSrgb(a));
  const [l2, a2, b2] = srgbToOklab(hsbToSrgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Distance at which points fall to about a third. A just-noticeable
 * difference is about 0.02, which still scores 973.
 */
const SCORE_SCALE = 0.12;

/** Points out of MAX_POINTS: full marks for an exact match, falling off smoothly. */
export function score(target: Hsb, guess: Hsb): number {
  return Math.round(MAX_POINTS * Math.exp(-((difference(target, guess) / SCORE_SCALE) ** 2)));
}

/** A short verdict for the result screen. */
export function verdict(points: number): string {
  if (points >= 950) return 'Perfect recall!';
  if (points >= 800) return 'Excellent!';
  if (points >= 600) return 'Close!';
  if (points >= 300) return 'Not bad';
  return 'Way off';
}
