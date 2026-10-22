import { describe, expect, it } from 'vitest';
import { describeDiagnosis, diagnose, diagnoseTritan } from '../src/diagnosis';

describe('diagnose', () => {
  it.each([
    // [R, P, D], type, severity
    [[85, 0, 0], 'normal', null],
    [[100, 0, 0], 'normal', null],
    [[80, 80, 85], 'normal', null],
    [[80, 75, 85], 'protan', 'mild'],
    [[80, 80, 80], 'red-green', 'mild'],
    [[65, 50, 30], 'deutan', 'mild'],
    [[60, 50, 50], 'red-green', 'mild'],
    [[55, 50, 30], 'deutan', 'moderate'],
    [[55, 30, 50], 'protan', 'moderate'],
    [[25, 30, 30], 'red-green', 'moderate'],
    [[20, 30, 50], 'protan', 'severe'],
    [[20, 50, 30], 'deutan', 'severe'],
    [[20, 50, 50], 'red-green', 'moderate'],
    [[0, 0, 0], 'red-green', 'severe'],
  ] as const)('%j → %s %s', (scores, type, severity) => {
    expect(diagnose(scores)).toEqual({ type, severity });
  });
});

describe('diagnoseTritan', () => {
  it.each([
    [100, 'normal', null],
    [85, 'normal', null],
    [80, 'tritan', 'mild'],
    [75, 'tritan', 'mild'],
    [60, 'tritan', 'mild'],
    [55, 'tritan', 'moderate'],
    [25, 'tritan', 'moderate'],
    [20, 'tritan', 'severe'],
    [0, 'tritan', 'severe'],
  ] as const)('%i → %s %s', (score, type, severity) => {
    expect(diagnoseTritan(score)).toEqual({ type, severity });
  });
});

describe('describeDiagnosis', () => {
  it('formats results', () => {
    expect(describeDiagnosis({ type: 'normal', severity: null })).toBe('Normal colour vision');
    expect(describeDiagnosis({ type: 'deutan', severity: 'mild' })).toBe(
      'Mild deutan-type colour vision deficiency',
    );
    expect(describeDiagnosis({ type: 'red-green', severity: 'moderate' })).toBe(
      'Moderate red-green colour vision deficiency',
    );
  });
});
