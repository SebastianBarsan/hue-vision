import { DEMO, GRID, STEPS, type Hsl, type Subtest } from './levels';
import { RED_GREEN, type Suite } from './suites';

export type Rng = () => number;

export interface Position {
  row: number;
  col: number;
}

/** 'between' waits for the user to start the next subtest after one ends. */
export type Phase = 'demo' | 'testing' | 'between' | 'done';

export interface State {
  /** The tab being taken: its subtests, early stop rule and diagnosis. */
  suite: Suite;
  phase: Phase;
  /**
   * Index into suite.subtests: the subtest being taken, or the one about to
   * start when between subtests. Meaningless during the demo.
   */
  subtest: number;
  /** Number of correct clicks in the current subtest. */
  level: number;
  /** True after one miss; a second consecutive miss ends the subtest. */
  strike: boolean;
  /** Percent score for each of the suite's subtests. */
  scores: readonly number[];
  /** Target centre for every level of the current subtest. */
  positions: readonly Position[];
}

export type Event = 'hit' | 'miss' | 'between' | 'start' | 'done' | 'ignored';

export interface Result {
  state: State;
  event: Event;
}

/** Random centre for a 3x3 block that never touches the board edge. */
function randomPosition(rng: Rng): Position {
  const span = GRID - 2;
  return { row: 1 + Math.floor(rng() * span), col: 1 + Math.floor(rng() * span) };
}

function randomPositions(count: number, rng: Rng): Position[] {
  return Array.from({ length: count }, () => randomPosition(rng));
}

function zeroScores(suite: Suite): number[] {
  return suite.subtests.map(() => 0);
}

export function createInitialState(rng: Rng, suite: Suite = RED_GREEN): State {
  return {
    suite,
    phase: 'demo',
    subtest: 0,
    level: 0,
    strike: false,
    scores: zeroScores(suite),
    positions: randomPositions(DEMO.steps.length, rng),
  };
}

function startSubtest(suite: Suite, scores: State['scores'], subtest: number, rng: Rng): State {
  return {
    suite,
    phase: 'testing',
    subtest,
    level: 0,
    strike: false,
    scores,
    positions: randomPositions(suite.subtests[subtest].steps.length, rng),
  };
}

export function restart(rng: Rng, suite: Suite = RED_GREEN): State {
  return startSubtest(suite, zeroScores(suite), 0, rng);
}

function between(suite: Suite, scores: State['scores'], subtest: number): State {
  return { suite, phase: 'between', subtest, level: 0, strike: false, scores, positions: [] };
}

/**
 * Leave the current subtest (or demo) and wait for the user to start the next
 * one, or finish the whole test.
 */
function advance(state: State): Result {
  const { suite, scores } = state;
  if (state.phase === 'demo') return { state: between(suite, scores, 0), event: 'between' };
  const last = state.subtest === suite.subtests.length - 1;
  if (last || suite.stopsEarly(scores)) {
    return { state: { ...state, phase: 'done', strike: false }, event: 'done' };
  }
  return { state: between(suite, scores, state.subtest + 1), event: 'between' };
}

/** Start the subtest the user is waiting on. */
export function nextTest(state: State, rng: Rng): Result {
  if (state.phase !== 'between') return { state, event: 'ignored' };
  return { state: startSubtest(state.suite, state.scores, state.subtest, rng), event: 'start' };
}

export function click(state: State, row: number, col: number): Result {
  if (state.phase === 'between' || state.phase === 'done') return { state, event: 'ignored' };

  const target = state.positions[state.level];
  const hit = Math.abs(row - target.row) <= 1 && Math.abs(col - target.col) <= 1;

  if (hit) {
    if (state.phase === 'demo') return advance(state);
    const level = state.level + 1;
    const scores = [...state.scores];
    scores[state.subtest] = Math.floor((100 * level) / STEPS);
    const next: State = { ...state, level, strike: false, scores };
    if (level >= state.positions.length) return advance(next);
    return { state: next, event: 'hit' };
  }

  if (!state.strike) return { state: { ...state, strike: true }, event: 'miss' };
  return advance(state);
}

export function idontSee(state: State): Result {
  if (state.phase === 'between' || state.phase === 'done') return { state, event: 'ignored' };
  return advance(state);
}

/**
 * The subtest being shown: the demo, a colour subtest, the next one when
 * between subtests, or the last one when done.
 */
export function currentSubtest(state: State): Subtest {
  return state.phase === 'demo' ? DEMO : state.suite.subtests[state.subtest];
}

export function currentTarget(state: State): { position: Position; colour: Hsl } | null {
  if (state.phase === 'between' || state.phase === 'done') return null;
  return {
    position: state.positions[state.level],
    colour: currentSubtest(state).steps[state.level],
  };
}
