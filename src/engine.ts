import { DEMO, GRID, STEPS, SUBTESTS, type Hsl, type Subtest } from './levels';

export type Rng = () => number;

export interface Position {
  row: number;
  col: number;
}

export type Phase = 'demo' | 'testing' | 'done';

export interface State {
  phase: Phase;
  /** Index into SUBTESTS; meaningless during the demo. */
  subtest: number;
  /** Number of correct clicks in the current subtest. */
  level: number;
  /** True after one miss; a second consecutive miss ends the subtest. */
  strike: boolean;
  /** Percent scores for red-green, purple-blue and purple-green. */
  scores: readonly [number, number, number];
  /** Target centre for every level of the current subtest. */
  positions: readonly Position[];
}

export type Event = 'hit' | 'miss' | 'advance' | 'done' | 'ignored';

export interface Result {
  state: State;
  event: Event;
}

/** Above this red-green score vision counts as normal and the test stops early. */
export const NORMAL_RED_GREEN = 80;

/** Random centre for a 3x3 block that never touches the board edge. */
function randomPosition(rng: Rng): Position {
  const span = GRID - 2;
  return { row: 1 + Math.floor(rng() * span), col: 1 + Math.floor(rng() * span) };
}

function randomPositions(count: number, rng: Rng): Position[] {
  return Array.from({ length: count }, () => randomPosition(rng));
}

export function createInitialState(rng: Rng): State {
  return {
    phase: 'demo',
    subtest: 0,
    level: 0,
    strike: false,
    scores: [0, 0, 0],
    positions: randomPositions(DEMO.steps.length, rng),
  };
}

function startSubtest(scores: State['scores'], subtest: number, rng: Rng): State {
  return {
    phase: 'testing',
    subtest,
    level: 0,
    strike: false,
    scores,
    positions: randomPositions(SUBTESTS[subtest].steps.length, rng),
  };
}

export function restart(rng: Rng): State {
  return startSubtest([0, 0, 0], 0, rng);
}

/** Leave the current subtest (or demo) and move on, or finish the whole test. */
function advance(state: State, rng: Rng): Result {
  if (state.phase === 'demo') {
    return { state: startSubtest(state.scores, 0, rng), event: 'advance' };
  }
  const last = state.subtest === SUBTESTS.length - 1;
  if (last || state.scores[0] > NORMAL_RED_GREEN) {
    return { state: { ...state, phase: 'done', strike: false }, event: 'done' };
  }
  return { state: startSubtest(state.scores, state.subtest + 1, rng), event: 'advance' };
}

export function click(state: State, row: number, col: number, rng: Rng): Result {
  if (state.phase === 'done') return { state, event: 'ignored' };

  const target = state.positions[state.level];
  const hit = Math.abs(row - target.row) <= 1 && Math.abs(col - target.col) <= 1;

  if (hit) {
    if (state.phase === 'demo') return advance(state, rng);
    const level = state.level + 1;
    const scores = [...state.scores] as [number, number, number];
    scores[state.subtest] = Math.floor((100 * level) / STEPS);
    const next: State = { ...state, level, strike: false, scores };
    if (level >= state.positions.length) return advance(next, rng);
    return { state: next, event: 'hit' };
  }

  if (!state.strike) return { state: { ...state, strike: true }, event: 'miss' };
  return advance(state, rng);
}

export function idontSee(state: State, rng: Rng): Result {
  if (state.phase === 'done') return { state, event: 'ignored' };
  return advance(state, rng);
}

/** The subtest being shown: the demo, a colour subtest, or the last one when done. */
export function currentSubtest(state: State): Subtest {
  return state.phase === 'demo' ? DEMO : SUBTESTS[state.subtest];
}

export function currentTarget(state: State): { position: Position; colour: Hsl } | null {
  if (state.phase === 'done') return null;
  return {
    position: state.positions[state.level],
    colour: currentSubtest(state).steps[state.level],
  };
}
