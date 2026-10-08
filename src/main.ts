import { onMosaicShown } from './mosaic';
import './colour-game-view';
import './hue-order-view';

/** The top-level tabs. Each keeps its progress while hidden. */
const views = [
  { tab: document.querySelector<HTMLButtonElement>('#tab-mosaic')!, onShow: onMosaicShown },
  { tab: document.querySelector<HTMLButtonElement>('#tab-game')!, onShow: () => {} },
  { tab: document.querySelector<HTMLButtonElement>('#tab-hue')!, onShow: () => {} },
];

function select(selected: (typeof views)[number]): void {
  for (const view of views) {
    const active = view === selected;
    view.tab.setAttribute('aria-selected', String(active));
    view.tab.classList.toggle('active', active);
    document.getElementById(view.tab.getAttribute('aria-controls')!)!.hidden = !active;
  }
  selected.onShow();
}

for (const view of views) view.tab.addEventListener('click', () => select(view));

select(views[0]);
