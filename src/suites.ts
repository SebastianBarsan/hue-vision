import { describeDiagnosis, diagnose, diagnoseTritan, type Diagnosis } from './diagnosis';
import { TRITAN_SUBTEST, SUBTESTS, type Subtest } from './levels';

/** One tab: a practice round, then its subtests in order. */
export interface Suite {
  id: string;
  name: string;
  subtests: readonly Subtest[];
  /** True when the scores so far make the remaining subtests unnecessary. */
  stopsEarly(scores: readonly number[]): boolean;
  /** Deficiency type and severity for the final scores. */
  diagnose(scores: readonly number[]): Diagnosis;
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
  diagnose,
  describe: (scores) => describeDiagnosis(diagnose(scores)),
  skippedNote: "Your red-green score was above 80%, so the other tests weren't needed.",
};

export const TRITAN: Suite = {
  id: 'tritan',
  name: 'Tritan (Blue-cone)',
  subtests: [TRITAN_SUBTEST],
  stopsEarly: () => false,
  diagnose: ([score]) => diagnoseTritan(score),
  describe: ([score]) => {
    const diagnosis = diagnoseTritan(score);
    // This tab alone can't rule out red-green deficiencies.
    return diagnosis.type === 'normal' ? 'Normal tritan (blue-cone) vision' : describeDiagnosis(diagnosis);
  },
};

export const SUITES: readonly Suite[] = [RED_GREEN, TRITAN];
