import type { Hsl } from './levels';

export type Vec3 = readonly [number, number, number];
type Mat3 = readonly [Vec3, Vec3, Vec3];

/** Linear sRGB to LMS cone excitations (Viénot, Brettel & Mollon 1999). */
const RGB_TO_LMS: Mat3 = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];

function multiply(m: Mat3, [x, y, z]: Vec3): Vec3 {
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ];
}

function invert([[a, b, c], [d, e, f], [g, h, i]]: Mat3): Mat3 {
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
}

const LMS_TO_RGB = invert(RGB_TO_LMS);

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB (0–1 per channel) to LMS cone excitations. */
export function srgbToLms(rgb: Vec3): Vec3 {
  return multiply(RGB_TO_LMS, rgb.map(toLinear) as unknown as Vec3);
}

/** LMS cone excitations to sRGB (0–1 per channel, not clamped). */
export function lmsToSrgb(lms: Vec3): Vec3 {
  return multiply(LMS_TO_RGB, lms).map(toGamma) as unknown as Vec3;
}

/** sRGB (0–1 per channel) to OKLab, a perceptually uniform colour space (Ottosson 2020). */
export function srgbToOklab(rgb: Vec3): Vec3 {
  const [l, m, s] = multiply(
    [
      [0.4122214708, 0.5363325363, 0.0514459929],
      [0.2119034982, 0.6806995451, 0.1073969566],
      [0.0883024619, 0.2817188376, 0.6299787005],
    ],
    rgb.map(toLinear) as unknown as Vec3,
  ).map(Math.cbrt);
  return multiply(
    [
      [0.2104542553, 0.793617785, -0.0040720468],
      [1.9779984951, -2.428592205, 0.4505937099],
      [0.0259040371, 0.7827717662, -0.808675766],
    ],
    [l, m, s],
  );
}

/** OKLab to sRGB (0–1 per channel, not clamped). */
export function oklabToSrgb(lab: Vec3): Vec3 {
  const lms = multiply(
    [
      [1, 0.3963377774, 0.2158037573],
      [1, -0.1055613458, -0.0638541728],
      [1, -0.0894841775, -1.291485548],
    ],
    lab,
  ).map((c) => c ** 3) as unknown as Vec3;
  return multiply(
    [
      [4.0767416621, -3.3077115913, 0.2309699292],
      [-1.2684380046, 2.6097574011, -0.3413193965],
      [-0.0041960863, -0.7034186147, 1.707614701],
    ],
    lms,
  ).map(toGamma) as unknown as Vec3;
}

/** sRGB (0–1 per channel) to HSL in CSS units, rounded to two decimal places. */
export function srgbToHsl([r, g, b]: Vec3): Hsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const round = (x: number) => Math.round(x * 100) / 100;
  return [round(h), round(s * 100), round(l * 100)];
}

/**
 * Cone-contrast directions. A step in one of these directions moves a colour
 * along a confusion line: the colours differ only in the signal of a cone type
 * the matching dichromat lacks, so for them the target matches the background.
 */
export const CONFUSION = {
  /** Lowers the L-cone (red) signal only: invisible without L cones. */
  protan: [-1, 0, 0],
  /** Raises the M-cone (green) signal only: invisible without M cones. */
  deutan: [0, 1, 0],
  /** Raises the S-cone (blue) signal only: invisible without S cones. */
  tritan: [0, 0, 1],
  /**
   * Raises L and lowers M by the same contrast, the red-green opponent
   * direction. Protans and deutans each see only one of the two changes, as a
   * brightness change, which the flicker hides.
   */
  redGreen: [1, -1, 0],
} as const satisfies Record<string, Vec3>;

/**
 * Target colours for a background, from easiest to hardest. Each cone's
 * excitation is scaled by `1 + contrast * direction`, with the contrast
 * falling geometrically from `maxContrast` to `minContrast`.
 */
export function confusionSteps(
  background: Vec3,
  direction: Vec3,
  count: number,
  maxContrast: number,
  minContrast: number,
): Vec3[] {
  const lms = srgbToLms(background);
  return Array.from({ length: count }, (_, i) => {
    const contrast = maxContrast * (minContrast / maxContrast) ** (i / (count - 1));
    return lmsToSrgb(lms.map((c, j) => c * (1 + contrast * direction[j])) as unknown as Vec3);
  });
}
