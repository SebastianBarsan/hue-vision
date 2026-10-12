# colourblind_test

A browser-based test of colour vision and two colour games, each in its own
tab:

- **Colour Mosaic**: find a block of slightly different colour in a
  flickering mosaic. It has two sub-tabs, Red-green and Tritan (Blue-cone), and gives
  a rough screening result.
- **Colour Recall**: memorise a colour, then recreate it from memory.
- **Hue Order**: sort a shuffled scale of colours back into order.

> This is a screening tool, not a medical diagnosis. Results depend on your
> screen's colour calibration and brightness.

## Colour Mosaic

- The board is an 18×18 grid of tiles. A 3×3 block in a different colour is
  hidden somewhere on it, and you click on it when you can see it.
- Every tile's lightness flickers independently. This hides brightness
  differences, so the block can only be found by its hue.
- The Red-green sub-tab starts with a grey practice round, then three tests:
  1. **Red-green**: a red block on a dark green background
  2. **Purple-blue**: a blue block on a violet background
  3. **Orange-green**: a green block on an orange background
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
| Orange-green | M cone up only | deutans |
| Tritan (Blue-cone) | S (blue) cone up only | tritans |

In the Red-green test the cone contrast starts at 50% and shrinks
geometrically to 1% by the last level. 50% is close to the screen gamut's limit
for that background, and 1% is about the smallest change an 8-bit screen can
show.

A change in one cone alone looks much fainter than the same contrast split
across two, so the Purple-blue and Orange-green tests don't reuse those
contrasts. Instead each level is set to the same visible colour difference
(OKLab chroma distance) as the matching Red-green level, so normal vision
scores about the same on all three. From 35% on they match exactly; the
easiest levels are capped a little lower because the screen gamut can't show
a bigger difference on those backgrounds. Any brightness difference left over
is hidden by the flicker.

### Tritan (Blue-cone) sub-tab

A separate sub-tab tests blue-yellow (tritan) vision with a single 20-level test:
a blue-violet block on an olive-yellow background. Only the S-cone signal
changes, which always moves the target towards violet, so a true blue isn't
possible without breaking the tritan isolation. The background is kept fairly
dark because the target stays about as light as it, and a light yellow gives a
pale lavender target. Like the Purple-blue and Orange-green tests, each level
shows the same visible colour difference as the matching Red-green level.
Each tab keeps its own progress.

| Tritan result | Score |
|---|---|
| Normal | 80 or more |
| Mild tritan-type | 60–75 |
| Moderate tritan-type | 25–55 |
| Severe tritan-type | below 25 |

### Mosaic results

With R = red-green, P = purple-blue and D = orange-green:

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

### How you might see it

The results screen of each mosaic tab ends with a side-by-side simulation: an
everyday picture as seen with normal colour vision, and the same picture as
seen with the deficiency the test found. There are five pictures (traffic
lights, strawberries, a pie chart, a metro map and a rainbow). All of them are
drawn on a canvas in `src/scenes.ts`, so no images are copied. You can switch to
any type (protan, deutan, tritan) and severity. After a normal result, it starts
on moderate deutan, the most common deficiency.

The simulation uses the full-strength matrices from Machado, Oliveira &
Fernandes (2009), applied in linear RGB. Milder severities blend the matrix
with the identity: mild 40%, moderate 70%, severe 100%. Someone with the
deficiency will see the two pictures as about the same. The simulation is mainly
for showing other people how the pictures look to them.

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

## Hue Order

A game in the spirit of hue-ordering tests such as the Farnsworth D-15. A
scale of **15 blocks** that blends from one colour to another is shuffled,
and you have **30 seconds** to put it back in order. Drag a block to move it, or tap two
blocks to swap them (keyboard: Tab to a block, Enter on two blocks to swap).
The round ends as soon as the scale is sorted, when time runs out, or on
**Finish now**.

- Each round picks one of six scales, never the same one twice in a row:
  Red → Yellow, Yellow → Green, Cyan → Blue, Blue → Purple, Purple → Pink and
  Magenta → Red. The scale's name is shown while you play.
- The blocks blend evenly in OKLCH between two vivid end colours. Where the
  blend would go beyond what the screen can show, its chroma is reduced just
  enough to fit. Neighbouring blocks differ by about 0.02–0.04 in OKLab, close
  to the smallest difference people can see, so it's meant to be hard. Green →
  cyan is left out because the screen can't show vivid enough colours in
  between.
- Either direction counts as sorted.
- A fresh shuffle has at most 2 blocks already next to their correct
  neighbour.
- **Points out of 1000**: a sorted scale scores 700 plus up to 300 for the time
  left. An unsorted one scores 700 times the share of its 14 neighbouring
  pairs that are correct.
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
| `src/simulate.ts` | Colour vision deficiency simulation matrices and per-pixel filter |
| `src/scenes.ts` | The everyday pictures drawn for the simulation |
| `src/simulation-view.ts` | The how-you-might-see-it section on the mosaic results screen |
| `src/main.ts` | Switches between the two top-level tabs |
| `src/mosaic.ts` | Connects the mosaic page, buttons and canvas to the engine |
| `src/colour-game.ts` | Colour Recall's colours, timings and scoring |
| `src/colour-game-view.ts` | Colour Recall's page, sliders and timers |
| `src/hue-order.ts` | Hue Order's colours, shuffling and scoring |
| `src/hue-order-view.ts` | Hue Order's page, dragging and timer |
| `tests/` | Vitest unit tests for the colours, engine, diagnosis and both games |

Built with Vite and TypeScript, with no UI framework.
