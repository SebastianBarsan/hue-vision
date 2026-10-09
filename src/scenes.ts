/** Everyday pictures for the colour vision simulation, drawn rather than copied. */

export const SCENE_WIDTH = 480;
export const SCENE_HEIGHT = 300;

export interface Scene {
  name: string;
  draw(ctx: CanvasRenderingContext2D): void;
}

const W = SCENE_WIDTH;
const H = SCENE_HEIGHT;

/** Small seeded RNG (mulberry32), so each scene looks the same every time. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function verticalGradient(ctx: CanvasRenderingContext2D, top: string, bottom: string, y0 = 0, y1 = H): void {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y0, W, y1 - y0);
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Two traffic lights, one on red and one on green. */
function trafficLights(ctx: CanvasRenderingContext2D): void {
  verticalGradient(ctx, '#6fb7e6', '#d6ecf7');
  ctx.fillStyle = '#4f9a3c';
  ctx.fillRect(0, 232, W, 30);
  ctx.fillStyle = '#56585d';
  ctx.fillRect(0, 262, W, 38);
  ctx.fillStyle = '#e9e9e4';
  for (let x = 10; x < W; x += 70) ctx.fillRect(x, 279, 40, 4);

  const lamps = ['#e8261c', '#f5a300', '#1fc25b'];
  for (const [x, lit] of [
    [150, 0],
    [330, 2],
  ]) {
    ctx.fillStyle = '#34363a';
    ctx.fillRect(x - 6, 190, 12, 75);
    ctx.fillStyle = '#1d1f22';
    ctx.beginPath();
    ctx.roundRect(x - 36, 24, 72, 176, 14);
    ctx.fill();
    lamps.forEach((colour, i) => {
      const y = 60 + i * 52;
      ctx.save();
      if (i === lit) {
        ctx.shadowColor = colour;
        ctx.shadowBlur = 28;
      } else {
        ctx.globalAlpha = 0.2;
      }
      circle(ctx, x, y, 21, colour);
      ctx.restore();
    });
  }
}

/** Ripe and unripe strawberries among leaves. */
function strawberries(ctx: CanvasRenderingContext2D): void {
  const rng = seeded(7);
  ctx.fillStyle = '#2d5f27';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    ctx.save();
    ctx.translate(rng() * W, rng() * H);
    ctx.rotate(rng() * Math.PI);
    ctx.beginPath();
    ctx.ellipse(0, 0, 26 + rng() * 22, 12 + rng() * 8, 0, 0, 2 * Math.PI);
    ctx.fillStyle = `hsl(${95 + rng() * 35} ${40 + rng() * 20}% ${24 + rng() * 20}%)`;
    ctx.fill();
    ctx.restore();
  }

  const berries: [number, number, number, string][] = [
    [70, 90, 30, '#d7192b'],
    [180, 70, 26, '#cf1f2e'],
    [300, 100, 32, '#d7192b'],
    [410, 75, 24, '#b8d36b'],
    [110, 210, 28, '#c9182a'],
    [230, 190, 24, '#e3e3a8'],
    [340, 220, 30, '#d41b2c'],
    [440, 190, 26, '#dc3b2f'],
    [30, 250, 22, '#a9c75f'],
  ];
  for (const [x, y, s, colour] of berries) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rng() - 0.5) * 0.8);
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 1.1, s * 0.2, -s * 0.85, -s * 0.75, 0, -s * 0.55);
    ctx.bezierCurveTo(s * 0.85, -s * 0.75, s * 1.1, s * 0.2, 0, s);
    ctx.fillStyle = colour;
    ctx.fill();
    for (let row = 0; row < 4; row++) {
      for (let col = -2; col <= 2; col++) {
        const sy = -s * 0.25 + row * s * 0.3;
        const sx = (col + (row % 2) * 0.5) * s * 0.28 * (1 - row * 0.18);
        circle(ctx, sx, sy, 1.6, '#f2d36a');
      }
    }
    ctx.fillStyle = '#3f8f2f';
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(0, -s * 0.6);
      ctx.rotate(Math.PI + (i - 2) * 0.55);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.2, s * 0.12, s * 0.28, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

/** A pie chart in a common default chart palette. */
function pieChart(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#f7f7f5';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#222';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('Sales by region', 24, 34);

  const slices: [string, number, string][] = [
    ['North', 30, '#d62728'],
    ['South', 22, '#2ca02c'],
    ['East', 18, '#ff7f0e'],
    ['West', 16, '#8c564b'],
    ['Central', 14, '#1f77b4'],
  ];
  const [cx, cy, r] = [150, 170, 105];
  let angle = -Math.PI / 2;
  ctx.strokeStyle = '#f7f7f5';
  ctx.lineWidth = 2;
  for (const [, share, colour] of slices) {
    const end = angle + (share / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, end);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.stroke();
    angle = end;
  }

  ctx.font = '16px system-ui, sans-serif';
  slices.forEach(([name, share, colour], i) => {
    const y = 100 + i * 34;
    ctx.fillStyle = colour;
    ctx.fillRect(300, y - 13, 18, 18);
    ctx.fillStyle = '#333';
    ctx.fillText(`${name}  ${share}%`, 330, y + 1);
  });
}

/** A metro map whose lines are told apart only by colour. */
function metroMap(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d7e7f0';
  ctx.beginPath();
  ctx.moveTo(0, 250);
  ctx.bezierCurveTo(140, 230, 300, 290, W, 255);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  const lines: [string, [number, number][]][] = [
    ['#e1251b', [[20, 80], [160, 80], [240, 160], [460, 160]]],
    ['#00a651', [[60, 280], [60, 200], [140, 120], [300, 120], [380, 40], [460, 40]]],
    ['#8b5a2b', [[20, 230], [180, 230], [260, 150], [260, 60], [300, 20]]],
    ['#f08a00', [[200, 20], [200, 200], [240, 240], [460, 240]]],
    ['#1f5fbf', [[20, 140], [120, 140], [200, 220], [380, 220], [420, 280]]],
    ['#7d3c98', [[340, 290], [340, 190], [420, 110], [460, 110]]],
  ];
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [colour, points] of lines) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = colour;
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#222';
  for (const [, points] of lines) {
    for (const [x, y] of points.slice(1, -1)) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** A rainbow over hills of flowers. */
function rainbow(ctx: CanvasRenderingContext2D): void {
  const rng = seeded(3);
  verticalGradient(ctx, '#4f8fcf', '#cfe6f5');
  const bands = ['#e81416', '#ffa500', '#faeb36', '#79c314', '#487de7', '#4b369d', '#70369d'];
  ctx.lineWidth = 13;
  ctx.globalAlpha = 0.85;
  bands.forEach((colour, i) => {
    ctx.beginPath();
    ctx.arc(240, 330, 250 - i * 13, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = colour;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#6cb543';
  ctx.beginPath();
  ctx.ellipse(110, 320, 260, 110, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#4c9a33';
  ctx.beginPath();
  ctx.ellipse(400, 330, 230, 100, 0, 0, 2 * Math.PI);
  ctx.fill();

  const flowers = ['#e3262f', '#f7d23e', '#b04fc6', '#ffffff', '#f06a2a'];
  for (let i = 0; i < 90; i++) {
    const x = rng() * W;
    const y = 240 + rng() * 60;
    circle(ctx, x, y, 3 + rng() * 2.5, flowers[Math.floor(rng() * flowers.length)]);
  }
}

export const SCENES: readonly Scene[] = [
  { name: 'Traffic lights', draw: trafficLights },
  { name: 'Strawberries', draw: strawberries },
  { name: 'Pie chart', draw: pieChart },
  { name: 'Metro map', draw: metroMap },
  { name: 'Rainbow', draw: rainbow },
];
