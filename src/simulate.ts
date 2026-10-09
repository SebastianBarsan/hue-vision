import { toGamma, toLinear, type Vec3 } from './colour';
import type { DeficiencyType, Severity } from './diagnosis';

export type SimulatedType = Exclude<DeficiencyType, 'normal'>;
export type Mat3 = readonly [Vec3, Vec3, Vec3];

/**
 * Linear sRGB matrices for full-strength (severity 1.0) protan, deutan and
 * tritan vision, from Machado, Oliveira & Fernandes (2009).
 */
const FULL: Record<SimulatedType, Mat3> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** How far each severity goes towards the full-strength matrix. */
export const SEVERITY_AMOUNT: Record<Severity, number> = { mild: 0.4, moderate: 0.7, severe: 1 };

/**
 * The matrix for a deficiency at `amount` (0 = normal, 1 = full strength).
 * Blending with the identity approximates Machado's in-between severities.
 */
export function simulationMatrix(type: SimulatedType, amount: number): Mat3 {
  return FULL[type].map((row, i) =>
    row.map((value, j) => amount * value + (1 - amount) * (i === j ? 1 : 0)),
  ) as unknown as Mat3;
}

const LINEAR = Float64Array.from({ length: 256 }, (_, i) => toLinear(i / 255));

const encode = (c: number): number => Math.round(255 * toGamma(Math.min(1, Math.max(0, c))));

/** Apply a simulation matrix in place to RGBA pixel data, leaving alpha alone. */
export function simulatePixels(data: Uint8ClampedArray, [m0, m1, m2]: Mat3): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = LINEAR[data[i]];
    const g = LINEAR[data[i + 1]];
    const b = LINEAR[data[i + 2]];
    data[i] = encode(m0[0] * r + m0[1] * g + m0[2] * b);
    data[i + 1] = encode(m1[0] * r + m1[1] * g + m1[2] * b);
    data[i + 2] = encode(m2[0] * r + m2[1] * g + m2[2] * b);
  }
}
