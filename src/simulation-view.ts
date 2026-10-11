import type { Diagnosis, Severity } from './diagnosis';
import { SCENE_HEIGHT, SCENE_WIDTH, SCENES, type Scene } from './scenes';
import { SEVERITY_AMOUNT, simulatePixels, simulationMatrix, type SimulatedType } from './simulate';

/** Canvas pixels per scene unit, so the pictures stay sharp on high-density screens. */
const SCALE = 2;

const TYPES: readonly { type: SimulatedType; label: string }[] = [
  { type: 'protan', label: 'Protan (red-weak)' },
  { type: 'deutan', label: 'Deutan (green-weak)' },
  { type: 'tritan', label: 'Tritan (blue-weak)' },
];
/** 'normal' shows the picture unchanged, for comparison. */
type Level = 'normal' | Severity;
const LEVELS: readonly Level[] = ['normal', 'mild', 'moderate', 'severe'];

const title = document.querySelector<HTMLElement>('#sim-title')!;
const intro = document.querySelector<HTMLElement>('#sim-intro')!;
const original = document.querySelector<HTMLCanvasElement>('#sim-original')!;
const simulated = document.querySelector<HTMLCanvasElement>('#sim-simulated')!;
const caption = document.querySelector<HTMLElement>('#sim-caption')!;

// The most common deficiency, preselected for when the user raises the level.
let type: SimulatedType = 'deutan';
let level: Level = 'moderate';
let scene: Scene = SCENES[0];

for (const canvas of [original, simulated]) {
  canvas.width = SCENE_WIDTH * SCALE;
  canvas.height = SCENE_HEIGHT * SCALE;
}

const capitalise = (text: string) => text[0].toUpperCase() + text.slice(1);

/** A row of toggle buttons that calls `select` and re-renders on click. */
function buttonRow<T>(selector: string, items: readonly T[], label: (item: T) => string, select: (item: T) => void) {
  const buttons = items.map((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label(item);
    button.addEventListener('click', () => {
      select(item);
      render();
    });
    return button;
  });
  document.querySelector<HTMLElement>(selector)!.append(...buttons);
  return (isActive: (item: T) => boolean) =>
    items.forEach((item, i) => {
      buttons[i].setAttribute('aria-pressed', String(isActive(item)));
      buttons[i].classList.toggle('active', isActive(item));
    });
}

const updateTypes = buttonRow('#sim-types', TYPES, (t) => t.label, (t) => (type = t.type));
const updateLevels = buttonRow('#sim-severities', LEVELS, capitalise, (l) => (level = l));
const updateScenes = buttonRow('#sim-scenes', SCENES, (s) => s.name, (s) => (scene = s));

function render(): void {
  updateTypes((t) => t.type === type);
  updateLevels((l) => l === level);
  updateScenes((s) => s === scene);

  const source = original.getContext('2d')!;
  source.save();
  source.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  scene.draw(source);
  source.restore();
  const image = source.getImageData(0, 0, original.width, original.height);
  if (level !== 'normal') simulatePixels(image.data, simulationMatrix(type, SEVERITY_AMOUNT[level]));
  simulated.getContext('2d')!.putImageData(image, 0, 0);
  caption.textContent = level === 'normal' ? 'Normal colour vision' : `${capitalise(level)} ${type}`;
}

/** Show the simulation for a test result, starting on the deficiency it found. */
export function showSimulation(diagnosis: Diagnosis): void {
  if (diagnosis.type === 'normal') {
    level = 'normal';
    title.textContent = 'How colour vision deficiencies change everyday pictures';
    intro.textContent =
      'Your result was normal, so both pictures match. Pick a type and severity to see how ' +
      'everyday pictures look to people with that deficiency.';
  } else {
    type = diagnosis.type;
    level = diagnosis.severity!;
    title.textContent = 'How you might see it';
    intro.textContent =
      'The right-hand picture simulates your result. If both pictures look about the same to you, ' +
      "that's expected: the simulation only removes colour differences your eyes already struggle " +
      'with. Show it to someone with normal colour vision to let them see through your eyes.';
  }
  render();
}
