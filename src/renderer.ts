import type { Position } from './engine';
import { GRID, type Hsl } from './levels';

/** One flicker step every ~57ms matches the original (9 steps per 510ms). */
const STEP_MS = 510 / 9;
/** Steps applied before the first frame so tiles start out of sync. */
const PRESHIFT_STEPS = 6;
const MAX_SIZE = 600;

class Tile {
  private phase = Math.random() * 10;
  private readonly freq = 0.1 + Math.random() / 10;

  constructor(
    public h: number,
    public s: number,
    public l: number,
  ) {}

  /**
   * Random-phase lightness drift. It hides brightness cues so the target can
   * only be found by its hue.
   */
  step(): void {
    this.phase += this.freq;
    this.l += Math.sin((this.phase * Math.PI) / 2);
  }

  set([h, s, l]: Hsl): void {
    this.h = h;
    this.s = s;
    this.l = l;
  }

  css(): string {
    const l = Math.min(100, Math.max(0, this.l));
    return `hsl(${this.h} ${this.s}% ${l}%)`;
  }
}

export class MosaicRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private tiles: Tile[] = [];
  private size = 0;
  private lastStep = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    requestAnimationFrame(this.frame);
  }

  /** Fit the canvas to its container (up to 600px) at device resolution. */
  resize(): void {
    const container = this.canvas.parentElement!;
    this.size = Math.min(MAX_SIZE, container.clientWidth);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = this.canvas.style.height = `${this.size}px`;
    this.canvas.width = this.canvas.height = Math.round(this.size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  /** Fresh board in the background colour, with the 3x3 target block painted in. */
  showBoard(background: Hsl, target: { position: Position; colour: Hsl } | null): void {
    this.fill(background);
    if (target) {
      const { row, col } = target.position;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          this.tiles[(row + dr) * GRID + col + dc].set(target.colour);
        }
      }
    }
    for (let i = 0; i < PRESHIFT_STEPS; i++) this.step();
    this.draw();
  }

  /** Tile under a pointer position, or null when outside the grid. */
  pointToTile(clientX: number, clientY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const { tile, offset } = this.geometry();
    const col = Math.floor((clientX - rect.left - offset) / tile);
    const row = Math.floor((clientY - rect.top - offset) / tile);
    if (row < 0 || row >= GRID || col < 0 || col >= GRID) return null;
    return { row, col };
  }

  private fill(background: Hsl): void {
    this.tiles = Array.from({ length: GRID * GRID }, () => new Tile(...background));
  }

  private geometry(): { tile: number; offset: number; gap: number } {
    const tile = Math.floor(this.size / GRID);
    return {
      tile,
      offset: (this.size - tile * GRID) / 2,
      gap: Math.max(1, Math.round(tile * 0.1)),
    };
  }

  private step(): void {
    for (const t of this.tiles) t.step();
  }

  private draw(): void {
    const { ctx } = this;
    const { tile, offset, gap } = this.geometry();
    ctx.clearRect(0, 0, this.size, this.size);
    this.tiles.forEach((t, i) => {
      ctx.fillStyle = t.css();
      const x = offset + (i % GRID) * tile;
      const y = offset + Math.floor(i / GRID) * tile;
      ctx.fillRect(x, y, tile - gap, tile - gap);
    });
  }

  private frame = (now: number): void => {
    if (now - this.lastStep >= STEP_MS) {
      // Skip missed steps (e.g. a background tab) rather than replaying them.
      this.lastStep = now;
      this.step();
      this.draw();
    }
    requestAnimationFrame(this.frame);
  };
}
