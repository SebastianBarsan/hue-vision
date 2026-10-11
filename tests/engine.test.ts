import { describe, expect, it } from 'vitest';
import {
  click,
  createInitialState,
  idontSee,
  nextTest,
  restart,
  type Rng,
  type State,
} from '../src/engine';
import { GRID } from '../src/levels';
import { BLUE_YELLOW } from '../src/suites';

/** Deterministic pseudo-random generator so tests are repeatable. */
function seeded(seed = 1): Rng {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

const rng = seeded();

function hit(state: State): State {
  const { row, col } = state.positions[state.level];
  return click(state, row, col).state;
}

/** A tile guaranteed to be outside the current target block. */
function miss(state: State): State {
  const { row, col } = state.positions[state.level];
  return click(state, (row + 9) % GRID, (col + 9) % GRID).state;
}

function next(state: State): State {
  return nextTest(state, rng).state;
}

function skip(state: State): State {
  return idontSee(state).state;
}

function hits(state: State, n: number): State {
  for (let i = 0; i < n; i++) state = hit(state);
  return state;
}

describe('demo', () => {
  it('waits to start red-green after a hit, without scoring', () => {
    const s = hit(createInitialState(rng));
    expect(s.phase).toBe('between');
    expect(s.subtest).toBe(0);
    expect(s.scores).toEqual([0, 0, 0]);
  });

  it('waits to start red-green after two misses', () => {
    const s = miss(miss(createInitialState(rng)));
    expect(s.phase).toBe('between');
    expect(s.subtest).toBe(0);
  });
});

describe('between subtests', () => {
  it('waits for Next test before starting the next subtest', () => {
    const r = idontSee(hits(restart(rng), 4));
    expect(r.event).toBe('between');
    expect(r.state).toMatchObject({ phase: 'between', subtest: 1, scores: [20, 0, 0] });

    const started = nextTest(r.state, rng);
    expect(started.event).toBe('start');
    expect(started.state).toMatchObject({ phase: 'testing', subtest: 1, level: 0 });
    expect(started.state.positions).toHaveLength(20);
  });

  it("ignores clicks and I don't see while waiting", () => {
    const s = skip(restart(rng));
    expect(click(s, 5, 5)).toEqual({ state: s, event: 'ignored' });
    expect(idontSee(s).event).toBe('ignored');
  });

  it('ignores Next test outside the pause', () => {
    const s = restart(rng);
    expect(nextTest(s, rng)).toEqual({ state: s, event: 'ignored' });
  });
});

describe('scoring', () => {
  it('adds 5% per correct click and moves the target', () => {
    let s = restart(rng);
    const r = click(s, s.positions[0].row, s.positions[0].col);
    expect(r.event).toBe('hit');
    expect(r.state.scores[0]).toBe(5);
    expect(r.state.level).toBe(1);
    s = hits(r.state, 3);
    expect(s.scores[0]).toBe(20);
  });

  it('accepts any tile of the 3x3 block', () => {
    const s = restart(rng);
    const { row, col } = s.positions[0];
    expect(click(s, row - 1, col + 1).event).toBe('hit');
    expect(click(s, row + 2, col).event).toBe('miss');
  });

  it('a hit clears a strike', () => {
    let s = miss(restart(rng));
    expect(s.strike).toBe(true);
    s = hit(s);
    expect(s.strike).toBe(false);
    s = miss(s);
    expect(s.subtest).toBe(0);
    expect(s.scores[0]).toBe(5);
  });

  it('two misses in a row end the subtest and keep its score', () => {
    const s = miss(miss(hits(restart(rng), 4)));
    expect(s.phase).toBe('between');
    expect(s.subtest).toBe(1);
    expect(s.scores).toEqual([20, 0, 0]);
  });

  it('20 hits on red-green end the whole test', () => {
    const s = hits(restart(rng), 20);
    expect(s.phase).toBe('done');
    expect(s.scores).toEqual([100, 0, 0]);
  });

  it('red-green above 80% ends the test at a strike-out', () => {
    const s = miss(miss(hits(restart(rng), 17)));
    expect(s.phase).toBe('done');
    expect(s.scores[0]).toBe(85);
  });

  it('red-green at exactly 80% continues to the next subtest', () => {
    const s = miss(miss(hits(restart(rng), 16)));
    expect(s.phase).toBe('between');
    expect(s.subtest).toBe(1);
  });

  it('100% on purple-blue moves on to orange-green', () => {
    let s = next(skip(restart(rng)));
    s = hits(s, 20);
    expect(s.subtest).toBe(2);
    expect(s.scores[1]).toBe(100);
  });
});

describe('I don\'t see', () => {
  it('moves to the next subtest, then finishes after the last', () => {
    let s = hits(restart(rng), 2);
    s = next(skip(s));
    expect(s.subtest).toBe(1);
    s = next(skip(s));
    expect(s.subtest).toBe(2);
    const r = idontSee(s);
    expect(r.event).toBe('done');
    expect(r.state.scores).toEqual([10, 0, 0]);
  });
});

describe('done', () => {
  it('ignores clicks and I don\'t see', () => {
    const s = hits(restart(rng), 20);
    expect(click(s, 5, 5)).toEqual({ state: s, event: 'ignored' });
    expect(idontSee(s).event).toBe('ignored');
    expect(nextTest(s, rng).event).toBe('ignored');
  });

  it('restart resets scores and starts red-green', () => {
    const s = restart(rng);
    expect(s).toMatchObject({ phase: 'testing', subtest: 0, level: 0, scores: [0, 0, 0] });
  });
});

describe('blue-yellow suite', () => {
  it('runs a practice round, then its single subtest', () => {
    let s = hit(createInitialState(rng, BLUE_YELLOW));
    expect(s).toMatchObject({ phase: 'between', subtest: 0, scores: [0] });
    s = next(s);
    expect(s).toMatchObject({ phase: 'testing', subtest: 0 });
    expect(s.suite).toBe(BLUE_YELLOW);
  });

  it('finishes after its subtest, even with a high score', () => {
    const r = idontSee(hits(restart(rng, BLUE_YELLOW), 17));
    expect(r.event).toBe('done');
    expect(r.state.scores).toEqual([85]);
  });

  it('restart keeps the suite', () => {
    expect(restart(rng, BLUE_YELLOW).suite).toBe(BLUE_YELLOW);
  });
});

describe('positions', () => {
  it('keep the 3x3 block on the board', () => {
    for (let i = 0; i < 200; i++) {
      for (const { row, col } of restart(rng).positions) {
        expect(row).toBeGreaterThanOrEqual(1);
        expect(row).toBeLessThanOrEqual(GRID - 2);
        expect(col).toBeGreaterThanOrEqual(1);
        expect(col).toBeLessThanOrEqual(GRID - 2);
      }
    }
  });

  it('are regenerated for each subtest', () => {
    const red = restart(rng);
    const blue = next(skip(red));
    expect(blue.positions).not.toEqual(red.positions);
  });
});
