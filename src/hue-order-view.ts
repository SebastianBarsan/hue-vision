import {
  BLOCKS,
  correctNeighbours,
  css,
  isSorted,
  makeScale,
  move,
  type Scale,
  score,
  shuffled,
  swap,
  TIME_MS,
} from './hue-order';

const rng = Math.random;
const BEST_KEY = 'hue-order-best';
/** Pointer travel, in pixels, before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 6;

const play = document.querySelector<HTMLElement>('#hue-play')!;
const stage = document.querySelector<HTMLElement>('#hue-stage')!;
const message = document.querySelector<HTMLElement>('#hue-message')!;
const timerBar = document.querySelector<HTMLElement>('#hue-timer')!;
const row = document.querySelector<HTMLElement>('#hue-row')!;
const startButton = document.querySelector<HTMLButtonElement>('#hue-start')!;
const help = document.querySelector<HTMLElement>('#hue-help')!;
const HELP = help.textContent!;
const submitButton = document.querySelector<HTMLButtonElement>('#hue-submit')!;
const giveUpButton = document.querySelector<HTMLButtonElement>('#hue-give-up')!;
const result = document.querySelector<HTMLElement>('#hue-result')!;
const verdictEl = document.querySelector<HTMLElement>('#hue-verdict')!;
const pointsEl = document.querySelector<HTMLElement>('#hue-points')!;
const yoursRow = document.querySelector<HTMLElement>('#hue-yours')!;
const sortedRow = document.querySelector<HTMLElement>('#hue-sorted')!;
const bestEl = document.querySelector<HTMLElement>('#hue-best')!;
const againButton = document.querySelector<HTMLButtonElement>('#hue-again')!;

type Phase = 'ready' | 'playing' | 'result';

let phase: Phase = 'ready';
let scale: Scale | null = null;
/** Block ids from left to right. */
let order: number[] = [];
let deadline = 0;
/** Block picked by a tap, waiting for a second tap to swap with. */
let selected: number | null = null;
let drag: { id: number; startX: number; moved: boolean } | null = null;

/** One button per block, reused across reorders so a drag keeps its element. */
const blocks = Array.from({ length: BLOCKS }, (_, id) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hue-block';
  button.dataset.id = String(id);
  button.setAttribute('aria-label', `Colour block ${id + 1}`);
  // Keyboard presses arrive as clicks with detail 0; pointer taps are handled below.
  button.addEventListener('click', (e) => {
    if (e.detail === 0) tap(id);
  });
  return button;
});

function render(): void {
  blocks.forEach((button, id) => {
    button.style.background = scale ? css(scale.colours[id]) : '';
    button.disabled = phase !== 'playing';
    button.classList.toggle('selected', id === selected);
  });
  // Moving a focused element blurs it, so put focus back for keyboard players.
  const focused = document.activeElement;
  row.replaceChildren(...order.map((id) => blocks[id]));
  if (focused instanceof HTMLElement && row.contains(focused)) focused.focus();
}

/** Show `text` under the blocks, or the usual instructions when it's null. */
function showHelp(text: string | null): void {
  help.textContent = text ?? HELP;
  help.classList.toggle('wrong', text !== null);
}

function changeOrder(next: number[]): void {
  order = next;
  showHelp(null);
  render();
}

/** End the round if the order is right; otherwise let the player keep going. */
function submit(): void {
  if (phase !== 'playing') return;
  if (isSorted(order)) finish();
  else showHelp('Not quite right yet. Keep trying!');
}

function tap(id: number): void {
  if (phase !== 'playing') return;
  if (selected === null) {
    selected = id;
  } else if (selected === id) {
    selected = null;
  } else {
    const a = order.indexOf(selected);
    selected = null;
    changeOrder(swap(order, a, order.indexOf(id)));
    return;
  }
  render();
}

row.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const block = (e.target as HTMLElement).closest<HTMLElement>('.hue-block');
  if (phase !== 'playing' || !block) return;
  drag = { id: Number(block.dataset.id), startX: e.clientX, moved: false };
  // Capture on the row, which stays put while its blocks are reordered.
  row.setPointerCapture(e.pointerId);
});

row.addEventListener('pointermove', (e) => {
  if (!drag || phase !== 'playing') return;
  if (!drag.moved) {
    if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD) return;
    drag.moved = true;
    selected = null;
    render();
    blocks[drag.id].classList.add('dragging');
  }
  const rect = row.getBoundingClientRect();
  const to = Math.min(BLOCKS - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * BLOCKS)));
  const from = order.indexOf(drag.id);
  if (to !== from) changeOrder(move(order, from, to));
});

function endDrag(): void {
  if (!drag) return;
  blocks[drag.id].classList.remove('dragging');
  if (!drag.moved) tap(drag.id);
  drag = null;
}

row.addEventListener('pointerup', endDrag);
row.addEventListener('pointercancel', () => {
  if (drag) drag.moved = true;
  endDrag();
});

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(points: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(points));
  } catch {
    // Storage can be unavailable (e.g. private windows); the best score is a nicety.
  }
}

function strip(target: HTMLElement, ids: readonly number[]): void {
  target.replaceChildren(
    ...ids.map((id) => {
      const span = document.createElement('span');
      span.style.background = css(scale!.colours[id]);
      return span;
    }),
  );
}

function start(): void {
  phase = 'playing';
  scale = makeScale(rng, scale?.name);
  order = shuffled(rng);
  selected = null;
  deadline = performance.now() + TIME_MS;
  play.hidden = false;
  result.hidden = true;
  startButton.hidden = true;
  submitButton.hidden = false;
  giveUpButton.hidden = false;
  showHelp(null);
  stage.textContent = `Sort the colours into a smooth scale: ${scale.name}`;
  render();
}

/** End the round. Giving up scores nothing, whatever the order. */
function finish(gaveUp = false): void {
  if (phase !== 'playing') return;
  const msLeft = Math.max(0, deadline - performance.now());
  phase = 'result';
  // The last move may have been mid-drag.
  if (drag) blocks[drag.id].classList.remove('dragging');
  drag = null;
  selected = null;

  const points = gaveUp ? 0 : score(order, msLeft);
  const best = readBest();
  if (points > best) saveBest(points);

  play.hidden = true;
  result.hidden = false;
  pointsEl.textContent = String(points);
  verdictEl.textContent = gaveUp
    ? 'You gave up'
    : isSorted(order)
      ? `Sorted with ${(msLeft / 1000).toFixed(1)} seconds to spare!`
      : `${correctNeighbours(order)} of ${BLOCKS - 1} neighbours in the right place`;
  strip(yoursRow, order);
  // Show the sorted scale the same way round as the player's attempt.
  const ascending = Array.from({ length: BLOCKS }, (_, i) => i);
  strip(sortedRow, order.indexOf(0) <= order.indexOf(BLOCKS - 1) ? ascending : ascending.reverse());
  bestEl.textContent = points > best ? 'New best score!' : `Your best: ${best}`;
  againButton.focus();
}

const view = document.querySelector<HTMLElement>('#hue-view')!;
/** Time of the previous animation frame, so hidden time can be added back. */
let lastFrame = performance.now();

function tick(now: number): void {
  // The clock stops while the tab is hidden.
  if (view.hidden) deadline += now - lastFrame;
  lastFrame = now;
  if (phase === 'playing') {
    const left = Math.max(0, deadline - now);
    timerBar.style.width = `${(left / TIME_MS) * 100}%`;
    const seconds = Math.ceil(left / 1000);
    message.textContent = `${seconds} second${seconds === 1 ? '' : 's'} left`;
    if (left === 0) finish();
  }
  requestAnimationFrame(tick);
}

startButton.addEventListener('click', start);
submitButton.addEventListener('click', submit);
giveUpButton.addEventListener('click', () => finish(true));
againButton.addEventListener('click', start);

// Before the first round: a row of blank blocks.
order = Array.from({ length: BLOCKS }, (_, i) => i);
message.textContent = `${BLOCKS} colours, ${TIME_MS / 1000} seconds.`;
render();
requestAnimationFrame(tick);
