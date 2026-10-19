export type DeficiencyType = 'normal' | 'protan' | 'deutan' | 'tritan';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface Diagnosis {
  type: DeficiencyType;
  severity: Severity | null;
}

/**
 * Scores are R = red-green, P = purple-blue (protan line) and D = orange-green
 * (deutan line). Every abnormal result gets a severity. The cut-offs have not
 * been calibrated against real protan and deutan observers.
 */
export function diagnose([redGreen, purpleBlue, orangeGreen]: readonly number[]): Diagnosis {
  const normal =
    redGreen > 80 || (redGreen === 80 && purpleBlue > 75 && orangeGreen > 80);
  if (normal) return { type: 'normal', severity: null };

  const type: DeficiencyType = orangeGreen < purpleBlue ? 'deutan' : 'protan';

  let severity: Severity;
  if (redGreen < 25 && (purpleBlue < 40 || orangeGreen < 40)) severity = 'severe';
  else if (redGreen < 60) severity = 'moderate';
  else severity = 'mild';

  return { type, severity };
}

/**
 * Tritan result from the single tritan score. The cut-offs mirror the
 * red-green ones and have not been calibrated against real tritan observers.
 */
export function diagnoseTritan(score: number): Diagnosis {
  if (score > 80) return { type: 'normal', severity: null };
  if (score < 25) return { type: 'tritan', severity: 'severe' };
  if (score < 60) return { type: 'tritan', severity: 'moderate' };
  return { type: 'tritan', severity: 'mild' };
}

export function describeDiagnosis({ type, severity }: Diagnosis): string {
  if (type === 'normal') return 'Normal colour vision';
  const label = severity![0].toUpperCase() + severity!.slice(1);
  return `${label} ${type}-type colour vision deficiency`;
}
