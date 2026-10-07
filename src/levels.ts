import { CONFUSION, confusionSteps, srgbToHsl, type Vec3 } from './colour';

export type Hsl = readonly [h: number, s: number, l: number];

export interface Subtest {
  name: string;
  background: Hsl;
  steps: readonly Hsl[];
}

export const GRID = 18;
/** Maximum points per subtest: each correct click adds 100 / STEPS percent. */
export const STEPS = 20;

export const DEMO: Subtest = {
  name: 'Demo',
  background: [0, 0, 20],
  steps: [[0, 0, 60]],
};

/** A subtest whose targets step along a cone-contrast direction from `background` (sRGB). */
function generated(
  name: string,
  background: Vec3,
  direction: Vec3,
  maxContrast: number,
  minContrast: number,
): Subtest {
  return {
    name,
    background: srgbToHsl(background),
    steps: confusionSteps(background, direction, STEPS, maxContrast, minContrast).map(srgbToHsl),
  };
}

/*
 * The red-green subtests share one contrast range, so the purple-blue (protan)
 * and purple-green (deutan) scores can be compared with each other. 50% is
 * close to the largest contrast the screen gamut allows for these backgrounds;
 * 1% is about the smallest change an 8-bit screen can still show.
 */
const MAX_CONTRAST = 0.5;
const MIN_CONTRAST = 0.01;

export const SUBTESTS: readonly Subtest[] = [
  // Dark green background; the easiest target is red.
  generated('Red-green', [0.05, 0.45, 0], CONFUSION.redGreen, MAX_CONTRAST, MIN_CONTRAST),
  // Purple background; less L-cone signal turns the target blue.
  generated('Purple-blue', [0.6, 0, 0.6], CONFUSION.protan, MAX_CONTRAST, MIN_CONTRAST),
  // Pink-purple background; more M-cone signal turns the target teal.
  generated('Purple-green', [0.65, 0, 0.4], CONFUSION.deutan, MAX_CONTRAST, MIN_CONTRAST),
];

/**
 * Dark yellow. Only the S-cone signal may change, so the easiest target on a
 * yellow background is violet-blue rather than pure blue (that would need a
 * yellow-green background).
 */
export const BLUE_YELLOW_SUBTEST = generated('Blue-yellow', [0.6, 0.62, 0.03], CONFUSION.tritan, 18, 0.06);
