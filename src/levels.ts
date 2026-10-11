import { chromaDifference, CONFUSION, confusionSteps, matchedSteps, srgbToHsl, type Vec3 } from './colour';

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

function subtest(name: string, background: Vec3, steps: readonly Vec3[]): Subtest {
  return { name, background: srgbToHsl(background), steps: steps.map(srgbToHsl) };
}

/*
 * Red-green steps from 50% cone contrast, close to the largest the screen
 * gamut allows on this background, down to 1%, about the smallest change an
 * 8-bit screen can still show.
 */
const RED_GREEN_BACKGROUND: Vec3 = [0.05, 0.45, 0];
const RED_GREEN_STEPS = confusionSteps(RED_GREEN_BACKGROUND, CONFUSION.redGreen, STEPS, 0.5, 0.01);

/*
 * A change in one cone alone looks much fainter than the same contrast split
 * across L and M, so equal contrasts would make the single-cone subtests far
 * harder than red-green. Instead each of their levels shows the same colour
 * difference as the red-green level, so normal vision scores about the same on
 * every subtest and the protan and deutan scores stay comparable with each
 * other.
 */
const RED_GREEN_DIFFERENCES = RED_GREEN_STEPS.map((step) => chromaDifference(step, RED_GREEN_BACKGROUND));

function matched(name: string, background: Vec3, direction: Vec3): Subtest {
  return subtest(name, background, matchedSteps(background, direction, RED_GREEN_DIFFERENCES));
}

export const SUBTESTS: readonly Subtest[] = [
  // Dark green background; the easiest target is red.
  subtest('Red-green', RED_GREEN_BACKGROUND, RED_GREEN_STEPS),
  // Violet background; less L-cone signal turns the target blue.
  matched('Purple-blue', [0.7, 0.1, 0.9], CONFUSION.protan),
  // Orange background; more M-cone signal turns the target green.
  matched('Orange-green', [0.75, 0.45, 0.15], CONFUSION.deutan),
];

/**
 * Olive-yellow. Only the S-cone signal may change, which moves the target
 * towards violet: no S-only change turns yellow into a true blue. The target
 * stays about as light as the background, so a darker yellow keeps it a
 * saturated blue-violet rather than lavender.
 */
export const BLUE_YELLOW_SUBTEST = matched('Blue-yellow', [0.52, 0.55, 0], CONFUSION.tritan);
