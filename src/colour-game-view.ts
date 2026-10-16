import {
  ADJUST_MS,
  css,
  HINT_MS,
  MEMORISE_MS,
  randomColour,
  score,
  START,
  verdict,
  type Hsb,
} from './colour-game';

const rng = Math.random;
const BEST_KEY = 'colour-recall-best';

const play = document.querySelector<HTMLElement>('#game-play')!;
const stage = document.querySelector<HTMLElement>('#game-stage')!;
const message = document.querySelector<HTMLElement>('#game-message')!;
const timerBar = document.querySelector<HTMLElement>('#game-timer')!;
const swatch = document.querySelector<HTMLElement>('#game-swatch')!;
const sliders = {
  h: document.querySelector<HTMLInputElement>('#hue-slider')!,
  s: document.querySelector<HTMLInputElement>('#saturation-slider')!,
  b: document.querySelector<HTMLInputElement>('#brightness-slider')!,
};
const startButton = document.querySelector<HTMLButtonElement>('#game-start')!;
const lockButton = document.querySelector<HTMLButtonElement>('#game-lock')!;
const hintButton = document.querySelector<HTMLButtonElement>('#game-hint')!;
const result = document.querySelector<HTMLElement>('#game-result')!;
const verdictEl = document.querySelector<HTMLElement>('#game-verdict')!;
const pointsEl = document.querySelector<HTMLElement>('#game-points')!;
const bestEl = document.querySelector<HTMLElement>('#game-best')!;
const againButton = document.querySelector<HTMLButtonElement>('#game-again')!;

type Phase = 'ready' | 'memorise' | 'adjust' | 'result';

let phase: Phase = 'ready';
let target: Hsb = START;
/** When the current timed phase ends, in performance.now() time. */
let deadline = 0;
/** Ends the hint flash; set only while the hint is showing. */
let hintTimeout: number | undefined;

function guess(): Hsb {
  return { h: sliders.h.valueAsNumber, s: sliders.s.valueAsNumber, b: sliders.b.valueAsNumber };
}

/** The swatch shows the guess, split with the target on the left while the hint is showing. */
function paintSwatch(): void {
  const g = css(guess());
  swatch.style.background =
    hintTimeout === undefined ? g : `linear-gradient(to right, ${css(target)} 50%, ${g} 50%)`;
}

function endHint(): void {
  clearTimeout(hintTimeout);
  hintTimeout = undefined;
}

function showHint(): void {
  if (phase !== 'adjust' || hintButton.disabled) return;
  hintButton.disabled = true;
  hintTimeout = setTimeout(() => {
    endHint();
    if (phase === 'adjust') paintSwatch();
  }, HINT_MS);
  paintSwatch();
}

/** Each slider's track shows the colours it can reach from the current guess. */
function paintSliders(): void {
  const g = guess();
  const gradient = (stops: Hsb[]) => `linear-gradient(to right, ${stops.map(css).join(', ')})`;
  const range = (n: number, at: (t: number) => Hsb) => Array.from({ length: n }, (_, i) => at(i / (n - 1)));
  sliders.h.style.setProperty('--track', gradient(range(13, (t) => ({ ...g, h: t * 360 }))));
  sliders.s.style.setProperty('--track', gradient(range(5, (t) => ({ ...g, s: t * 100 }))));
  sliders.b.style.setProperty('--track', gradient(range(5, (t) => ({ ...g, b: t * 100 }))));
  if (phase === 'adjust') paintSwatch();
}

function setSliders(colour: Hsb, enabled: boolean): void {
  sliders.h.valueAsNumber = colour.h;
  sliders.s.valueAsNumber = colour.s;
  sliders.b.valueAsNumber = colour.b;
  for (const slider of Object.values(sliders)) slider.disabled = !enabled;
  paintSliders();
}

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

const describe = ({ h, s, b }: Hsb) => `H ${Math.round(h)}° · S ${s} · B ${b}`;

function setPhase(next: Phase): void {
  phase = next;
  endHint();
  play.hidden = phase === 'result';
  result.hidden = phase !== 'result';
  startButton.hidden = phase !== 'ready';
  lockButton.hidden = phase !== 'adjust';
  hintButton.hidden = phase !== 'adjust';
  hintButton.disabled = false;

  switch (phase) {
    case 'ready':
      stage.textContent = 'How well can you remember a colour?';
      message.textContent = `You'll see a colour for ${MEMORISE_MS / 1000} seconds.`;
      swatch.style.background = '';
      swatch.textContent = '?';
      timerBar.style.width = '0';
      setSliders(START, false);
      break;
    case 'memorise':
      target = randomColour(rng);
      stage.textContent = 'Memorise this colour';
      swatch.style.background = css(target);
      swatch.textContent = '';
      setSliders(START, false);
      deadline = performance.now() + MEMORISE_MS;
      break;
    case 'adjust':
      stage.textContent = 'Now recreate it';
      setSliders(START, true);
      deadline = performance.now() + ADJUST_MS;
      sliders.h.focus();
      break;
    case 'result':
      showResult();
      break;
  }
}

function showResult(): void {
  const g = guess();
  const points = score(target, g);
  const best = readBest();
  if (points > best) saveBest(points);

  pointsEl.textContent = String(points);
  verdictEl.textContent = verdict(points);
  document.querySelector<HTMLElement>('#result-target')!.style.background = css(target);
  document.querySelector<HTMLElement>('#result-guess')!.style.background = css(g);
  document.querySelector<HTMLElement>('#result-target-value')!.textContent = describe(target);
  document.querySelector<HTMLElement>('#result-guess-value')!.textContent = describe(g);
  bestEl.textContent = points > best ? 'New best score!' : `Your best: ${best}`;
  againButton.focus();
}

const view = document.querySelector<HTMLElement>('#game-view')!;
/** Time of the previous animation frame, so hidden time can be added back. */
let lastFrame = performance.now();

/** Counts down the timed phases and moves on when time runs out. */
function tick(now: number): void {
  // The clock stops while the tab is hidden.
  if (view.hidden) deadline += now - lastFrame;
  lastFrame = now;
  if (phase === 'memorise' || phase === 'adjust') {
    const total = phase === 'memorise' ? MEMORISE_MS : ADJUST_MS;
    const left = Math.max(0, deadline - now);
    timerBar.style.width = `${(left / total) * 100}%`;
    const seconds = Math.ceil(left / 1000);
    message.textContent =
      phase === 'memorise'
        ? `Hidden in ${seconds}…`
        : `${seconds} second${seconds === 1 ? '' : 's'} left`;
    if (left === 0) setPhase(phase === 'memorise' ? 'adjust' : 'result');
  }
  requestAnimationFrame(tick);
}

for (const slider of Object.values(sliders)) slider.addEventListener('input', paintSliders);

startButton.addEventListener('click', () => setPhase('memorise'));
lockButton.addEventListener('click', () => setPhase('result'));
hintButton.addEventListener('click', showHint);
againButton.addEventListener('click', () => setPhase('memorise'));

setPhase('ready');
requestAnimationFrame(tick);
