import {
  click,
  createInitialState,
  currentSubtest,
  currentTarget,
  idontSee,
  nextTest,
  restart,
  type Result,
  type State,
} from './engine';
import { MosaicRenderer } from './renderer';
import { showSimulation } from './simulation-view';
import { SUITES, type Suite } from './suites';

const rng = Math.random;

const canvas = document.querySelector<HTMLCanvasElement>('#mosaic')!;
const tabs = document.querySelector<HTMLElement>('#tabs')!;
const scoresEl = document.querySelector<HTMLElement>('#scores')!;
const stage = document.querySelector<HTMLElement>('#stage')!;
const message = document.querySelector<HTMLElement>('#message')!;
const idontSeeButton = document.querySelector<HTMLButtonElement>('#idontsee')!;
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!;
const pause = document.querySelector<HTMLElement>('#pause')!;
const pauseText = document.querySelector<HTMLElement>('#pause-text')!;
const nextButton = document.querySelector<HTMLButtonElement>('#next')!;
const testView = [
  scoresEl,
  stage,
  message,
  document.querySelector<HTMLElement>('.board')!,
  document.querySelector<HTMLElement>('#controls')!,
];
const results = document.querySelector<HTMLElement>('#results')!;
const diagnosisEl = document.querySelector<HTMLElement>('#diagnosis')!;
const resultScores = document.querySelector<HTMLElement>('#result-scores')!;
const skippedNote = document.querySelector<HTMLElement>('#skipped-note')!;
const againButton = document.querySelector<HTMLButtonElement>('#again')!;
const simulation = document.querySelector<HTMLElement>('#simulation')!;

const renderer = new MosaicRenderer(canvas);

/** Each tab keeps its own progress, so switching tabs doesn't lose it. */
const states = new Map<Suite, State>(SUITES.map((suite) => [suite, createInitialState(rng, suite)]));
let state: State = states.get(SUITES[0])!;
let scoreEls: HTMLElement[] = [];

const tabButtons = SUITES.map((suite) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'tab');
  button.textContent = suite.name;
  button.addEventListener('click', () => switchSuite(suite));
  return button;
});
tabs.append(...tabButtons);

function setMessage(text: string): void {
  message.textContent = text;
}

/** One score per subtest of the current tab. */
function buildScores(): void {
  scoreEls = state.suite.subtests.map((subtest) => {
    const span = document.createElement('span');
    span.append(`${subtest.name}: `, document.createElement('b'));
    return span;
  });
  scoresEl.replaceChildren(...scoreEls);
}

function updateTabs(): void {
  SUITES.forEach((suite, i) => {
    const selected = suite === state.suite;
    tabButtons[i].setAttribute('aria-selected', String(selected));
    tabButtons[i].classList.toggle('active', selected);
  });
}

function updateText(): void {
  const { subtests } = state.suite;
  scoreEls.forEach((el, i) => {
    el.querySelector('b')!.textContent = `${state.scores[i]}%`;
    el.classList.toggle('active', state.phase === 'testing' && state.subtest === i);
  });
  const subtestName = subtests[state.subtest].name;
  const testName =
    subtests.length === 1
      ? subtestName
      : `Test ${state.subtest + 1} of ${subtests.length} – ${subtestName}`;
  stage.textContent =
    state.phase === 'demo'
      ? 'Practice round'
      : state.phase === 'done'
        ? 'Test complete'
        : state.phase === 'between'
          ? `Up next: ${testName}`
          : testName;
  idontSeeButton.disabled = state.phase === 'between' || state.phase === 'done';
}

/** Cover the board with a Next test button until the user starts the next subtest. */
function updatePause(): void {
  const paused = state.phase === 'between';
  const wasPaused = !pause.hidden;
  pause.hidden = !paused;
  if (!paused) return;
  const { subtests } = state.suite;
  if (state.subtest === 0) {
    pauseText.textContent = 'Practice round complete';
    nextButton.textContent = subtests.length === 1 ? 'Start test' : 'Start test 1';
  } else {
    const finished = state.subtest - 1;
    pauseText.textContent = `${subtests[finished].name} test complete: ${state.scores[finished]}%`;
    nextButton.textContent = 'Next test';
  }
  if (!wasPaused) nextButton.focus();
}

function showBoard(): void {
  if (state.phase !== 'done') {
    renderer.showBoard(currentSubtest(state).background, currentTarget(state));
  }
}

/** Swap the board for the final results screen once the whole test is done. */
function updateResults(): void {
  const done = state.phase === 'done';
  testView.forEach((el) => (el.hidden = done));
  results.hidden = !done;
  simulation.hidden = !done;
  if (!done) return;

  const { suite } = state;
  showSimulation(suite.diagnose(state.scores));
  diagnosisEl.textContent = suite.describe(state.scores);
  // Subtests after the last one taken were skipped by the suite's early stop.
  resultScores.replaceChildren(
    ...suite.subtests.map((subtest, i) => {
      const taken = i <= state.subtest;
      const li = document.createElement('li');
      li.classList.toggle('skipped', !taken);
      const name = document.createElement('span');
      name.textContent = subtest.name;
      const bar = document.createElement('span');
      bar.className = 'bar';
      const fill = document.createElement('span');
      fill.style.width = `${taken ? state.scores[i] : 0}%`;
      bar.append(fill);
      const value = document.createElement('b');
      value.textContent = taken ? `${state.scores[i]}%` : 'Not needed';
      li.append(name, bar, value);
      return li;
    }),
  );
  skippedNote.hidden = state.subtest === suite.subtests.length - 1;
  skippedNote.textContent = suite.skippedNote ?? '';
  againButton.focus();
}

function setState(next: State): void {
  state = next;
  states.set(state.suite, state);
}

function apply({ state: next, event }: Result): void {
  setState(next);
  switch (event) {
    case 'ignored':
      return;
    case 'miss':
      setMessage('Try again!');
      break;
    case 'hit':
      setMessage('Click on the small square!');
      break;
    case 'between':
      setMessage('');
      break;
    case 'start':
      setMessage('Click on the small square!');
      break;
    case 'done':
      setMessage('');
      break;
  }
  if (event !== 'miss') showBoard();
  updateText();
  updatePause();
  updateResults();
}

/** Redraw everything for the current state, e.g. after switching tabs. */
function renderAll(): void {
  updateTabs();
  buildScores();
  updateResults();
  const active = state.phase === 'demo' || state.phase === 'testing';
  setMessage(active ? 'Click on the small square!' : '');
  showBoard();
  updateText();
  updatePause();
}

function switchSuite(suite: Suite): void {
  if (suite === state.suite) return;
  state = states.get(suite)!;
  renderAll();
}

canvas.addEventListener('pointerdown', (e) => {
  const tile = renderer.pointToTile(e.clientX, e.clientY);
  if (tile) apply(click(state, tile.row, tile.col));
});

idontSeeButton.addEventListener('click', () => apply(idontSee(state)));

nextButton.addEventListener('click', () => apply(nextTest(state, rng)));

function startOver(): void {
  setState(restart(rng, state.suite));
  renderAll();
}

restartButton.addEventListener('click', startOver);
againButton.addEventListener('click', startOver);

window.addEventListener('resize', () => renderer.resize());

renderAll();

/** Refit the board, which has no size while its tab is hidden. */
export function onMosaicShown(): void {
  renderer.resize();
}
