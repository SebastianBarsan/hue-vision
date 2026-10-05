// Placeholder level colours: every level is a plain grey for now.

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

/** One grey step per level, until real level colours are added. */
function placeholderSteps(): Hsl[] {
  return Array.from({ length: STEPS }, (): Hsl => [0, 0, 50]);
}

export const SUBTESTS: readonly Subtest[] = [
  { name: 'Red-green', background: [0, 0, 30], steps: placeholderSteps() },
  { name: 'Purple-blue', background: [0, 0, 30], steps: placeholderSteps() },
  { name: 'Purple-green', background: [0, 0, 30], steps: placeholderSteps() },
];
