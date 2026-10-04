export type DeficiencyType = 'normal' | 'protan' | 'deutan';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface Diagnosis {
  type: DeficiencyType;
  severity: Severity | null;
}

/**
 * Same rules as the original test, with its gaps closed so every abnormal
 * result gets a severity (the original left R = 25, 60 and 80 unlabelled).
 */
export function diagnose([redGreen, purpleBlue, purpleGreen]: readonly number[]): Diagnosis {
  const normal =
    redGreen > 80 || (redGreen === 80 && purpleBlue > 75 && purpleGreen > 80);
  if (normal) return { type: 'normal', severity: null };

  const type: DeficiencyType = purpleGreen < purpleBlue ? 'deutan' : 'protan';

  let severity: Severity;
  if (redGreen < 25 && (purpleBlue < 40 || purpleGreen < 40)) severity = 'severe';
  else if (redGreen < 60) severity = 'moderate';
  else severity = 'mild';

  return { type, severity };
}

export function describeDiagnosis({ type, severity }: Diagnosis): string {
  if (type === 'normal') return 'Normal colour vision';
  const label = severity![0].toUpperCase() + severity!.slice(1);
  return `${label} ${type}-type colour vision deficiency`;
}
