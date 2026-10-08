# colourblind_test

A browser-based test of colour vision and a colour memory game, each in its
own tab:

- **Colour Mosaic**: find a block of slightly different colour in a
  flickering mosaic. It has two sub-tabs, Red-green and Blue-yellow, and gives
  a rough screening result.
- **Colour Recall**: memorise a colour, then recreate it from memory.

> This is a screening tool, not a medical diagnosis. Results depend on your
> screen's colour calibration and brightness.

## Colour Mosaic

- The board is an 18×18 grid of tiles. A 3×3 block in a different colour is
  hidden somewhere on it, and you click on it when you can see it.
- Every tile's lightness flickers independently. This hides brightness
  differences, so the block can only be found by its hue.
- The Red-green sub-tab starts with a grey practice round, then three tests:
  1. **Red-green**: a red block on a dark green background
  2. **Purple-blue**: a blue block on a purple background
  3. **Purple-green**: a teal block on a pink-purple background
- Each test has 20 levels. Each correct click adds 5% and moves to a block whose
  colour is closer to the background.
- A test ends after **two misses in a row**, after **I don't see**, or after
  all 20 levels. A single miss followed by a hit carries on.
- The whole test stops early when the red-green score is above 80%.

### How the colours are generated

The colours aren't taken from a table. They're calculated in `src/colour.ts`
by converting the background to LMS cone excitations (Viénot, Brettel & Mollon
1999) and moving it along a colour-confusion line: the target differs from the
background only in signals that a particular type of colour vision deficiency
can't use.

| Test | What changes | Who can't see the difference |
|---|---|---|
| Red-green | L (red) cone up, M (green) cone down by the same contrast | protans and deutans |
| Purple-blue | L cone down only | protans |
| Purple-green | M cone up only | deutans |
| Blue-yellow | S (blue) cone up only | tritans |

The three red-green tab tests share one range: the cone contrast starts at
50% and shrinks geometrically to 1% by the last level. 50% is close to the
screen gamut's limit for these backgrounds, and 1% is about the smallest change
an 8-bit screen can show. Any brightness difference left over is hidden by the
flicker.

### Blue-yellow sub-tab

A separate sub-tab tests blue-yellow (tritan) vision with a single 20-level test:
a violet-blue block on a dark yellow background. The S-cone contrast starts at
+1800% and shrinks geometrically to +6% by the last level. Each tab keeps its
own progress.

| Blue-yellow result | Score |
|---|---|
| Normal | 80 or more |
| Mild tritan-type | 60–75 |
| Moderate tritan-type | 25–55 |
| Severe tritan-type | below 25 |

### Mosaic results

With R = red-green, P = purple-blue and D = purple-green:

| Result | Rule |
|---|---|
| Normal colour vision | R > 80, or R = 80 with P > 75 and D > 80 |
| Deutan-type deficiency | otherwise, if D < P |
| Protan-type deficiency | otherwise |

| Severity | Rule |
|---|---|
| Severe | R < 25 and (P < 40 or D < 40) |
| Moderate | otherwise, R < 60 |
| Mild | otherwise |

None of the cut-offs, in either mosaic tab, have been checked against people with
known colour vision deficiencies.

## Colour Recall

A game rather than a test. A random colour is shown for **5 seconds**, then
hidden. You then have **20 seconds** to recreate it with hue, saturation and
brightness sliders, or press **Lock in** to finish early. When time runs out,
the sliders' current colour is your answer.

- Target colours have saturation and brightness of at least 25, so the hue is
  always visible.
- The sliders start at hue 180, saturation 50, brightness 50 every round. Each
  slider's track shows the colours it can reach from your current guess.
- Points out of 1000 come from the distance between the two colours in OKLab,
  a perceptually uniform colour space: `1000 × exp(−(distance / 0.12)²)`. An
  exact match scores 1000, a barely visible difference about 970, and being
  15° off in hue about 640.
- Your best score is kept in the browser.

## Running it

Requires Node.js 20 or later.

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests
npm run build    # static build in dist/
```

## Project layout

| Path | Contents |
|---|---|
| `src/colour.ts` | Colour conversions (LMS, OKLab, HSL) and the confusion-line step generator |
| `src/levels.ts` | Backgrounds, directions and contrast ranges for each test |
| `src/suites.ts` | The two mosaic sub-tabs and how each turns its scores into a result |
| `src/engine.ts` | Test rules as a pure state machine (clicks, misses, scoring, moving between tests) |
| `src/diagnosis.ts` | Turns the three scores into a result |
| `src/renderer.ts` | Canvas drawing, lightness flicker and click-to-tile mapping |
| `src/main.ts` | Switches between the two top-level tabs |
| `src/mosaic.ts` | Connects the mosaic page, buttons and canvas to the engine |
| `src/colour-game.ts` | Colour Recall's colours, timings and scoring |
| `src/colour-game-view.ts` | Colour Recall's page, sliders and timers |
| `tests/` | Vitest unit tests for the colours, engine, diagnosis and Colour Recall |

Built with Vite and TypeScript, with no UI framework.
