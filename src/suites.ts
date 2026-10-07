import { describeDiagnosis, diagnose } from './diagnosis';
import { SUBTESTS, type Subtest } from './levels';

/** A practice round, then a set of subtests in order. */
export interface Suite {
  id: string;
  name: string;
  subtests: readonly Subtest[];
  /** True when the scores so far make the remaining subtests unnecessary. */
  stopsEarly(scores: readonly number[]): boolean;
  /** Result headline for the final scores. */
  describe(scores: readonly number[]): string;
  /** Shown on the results screen when stopsEarly skipped subtests. */
  skippedNote?: string;
}

/** Above this red-green score vision counts as normal and the test stops early. */
export const NORMAL_RED_GREEN = 80;

export const RED_GREEN: Suite = {
  id: 'red-green',
  name: 'Red-green',
  subtests: SUBTESTS,
  stopsEarly: (scores) => scores[0] > NORMAL_RED_GREEN,
  describe: (scores) => describeDiagnosis(diagnose(scores)),
  skippedNote: "Your red-green score was above 80%, so the other tests weren't needed.",
};
