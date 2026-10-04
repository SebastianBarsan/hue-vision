import { describeDiagnosis, diagnose } from './diagnosis';
import {
  click,
  createInitialState,
  currentSubtest,
  currentTarget,
  idontSee,
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
const scoreEls = [...document.querySelectorAll<HTMLElement>('[data-score]')];

const renderer = new MosaicRenderer(canvas);
let state: State = createInitialState(rng);

function setMessage(text: string, isResult = false): void {
  message.textContent = text;
  message.classList.toggle('result', isResult);
}

function updateText(): void {
  scoreEls.forEach((el, i) => {
    el.querySelector('b')!.textContent = `${state.scores[i]}%`;
    el.classList.toggle('active', state.phase === 'testing' && state.subtest === i);
  });
  stage.textContent =
    state.phase === 'demo'
      ? 'Practice round'
      : state.phase === 'done'
        ? 'Test complete'
        : `Test ${state.subtest + 1} of ${SUBTESTS.length} – ${SUBTESTS[state.subtest].name}`;
  idontSeeButton.disabled = state.phase === 'done';
}

function showBoard(): void {
  if (state.phase === 'done') {
    renderer.showEnd(currentSubtest(state).background);
  } else {
    renderer.showBoard(currentSubtest(state).background, currentTarget(state));
  }
}

function apply({ state: next, event }: Result): void {
  const fromDemo = state.phase === 'demo';
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
    case 'advance':
      setMessage(
        fromDemo
          ? 'Click on the small square!'
          : `Next: ${SUBTESTS[state.subtest].name}. Click on the small square!`,
      );
      break;
    case 'done':
      setMessage(`Result: ${describeDiagnosis(diagnose(state.scores))}`, true);
      break;
  }
  if (event !== 'miss') showBoard();
  updateText();
}

canvas.addEventListener('pointerdown', (e) => {
  const tile = renderer.pointToTile(e.clientX, e.clientY);
  if (tile) apply(click(state, tile.row, tile.col, rng));
});

idontSeeButton.addEventListener('click', () => apply(idontSee(state, rng)));

restartButton.addEventListener('click', () => {
  state = restart(rng);
  setMessage('Click on the small square!');
  showBoard();
  updateText();
});

window.addEventListener('resize', () => renderer.resize());

setMessage('Click on the small square!');
showBoard();
updateText();
