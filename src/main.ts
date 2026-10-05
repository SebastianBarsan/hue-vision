import { describeDiagnosis, diagnose } from './diagnosis';
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
import { SUBTESTS } from './levels';
import { MosaicRenderer } from './renderer';

const rng = Math.random;

const canvas = document.querySelector<HTMLCanvasElement>('#mosaic')!;
const stage = document.querySelector<HTMLElement>('#stage')!;
const message = document.querySelector<HTMLElement>('#message')!;
const idontSeeButton = document.querySelector<HTMLButtonElement>('#idontsee')!;
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!;
const pause = document.querySelector<HTMLElement>('#pause')!;
const pauseText = document.querySelector<HTMLElement>('#pause-text')!;
const nextButton = document.querySelector<HTMLButtonElement>('#next')!;
const scoreEls = [...document.querySelectorAll<HTMLElement>('[data-score]')];
const testView = [
  document.querySelector<HTMLElement>('#scores')!,
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

const renderer = new MosaicRenderer(canvas);
let state: State = createInitialState(rng);

function setMessage(text: string): void {
  message.textContent = text;
}

function updateText(): void {
  scoreEls.forEach((el, i) => {
    el.querySelector('b')!.textContent = `${state.scores[i]}%`;
    el.classList.toggle('active', state.phase === 'testing' && state.subtest === i);
  });
  const testName = `Test ${state.subtest + 1} of ${SUBTESTS.length} – ${SUBTESTS[state.subtest].name}`;
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
  if (state.subtest === 0) {
    pauseText.textContent = 'Practice round complete';
    nextButton.textContent = 'Start test 1';
  } else {
    const finished = state.subtest - 1;
    pauseText.textContent = `${SUBTESTS[finished].name} test complete: ${state.scores[finished]}%`;
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
  if (!done) return;

  diagnosisEl.textContent = describeDiagnosis(diagnose(state.scores));
  // Subtests after the last one taken were skipped because red-green was normal.
  resultScores.replaceChildren(
    ...SUBTESTS.map((subtest, i) => {
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
  skippedNote.hidden = state.subtest === SUBTESTS.length - 1;
  againButton.focus();
}

function apply({ state: next, event }: Result): void {
  state = next;
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

canvas.addEventListener('pointerdown', (e) => {
  const tile = renderer.pointToTile(e.clientX, e.clientY);
  if (tile) apply(click(state, tile.row, tile.col));
});

idontSeeButton.addEventListener('click', () => apply(idontSee(state)));

nextButton.addEventListener('click', () => apply(nextTest(state, rng)));

function startOver(): void {
  state = restart(rng);
  updateResults();
  setMessage('Click on the small square!');
  showBoard();
  updateText();
  updatePause();
}

restartButton.addEventListener('click', startOver);
againButton.addEventListener('click', startOver);

window.addEventListener('resize', () => renderer.resize());

setMessage('Click on the small square!');
showBoard();
updateText();
