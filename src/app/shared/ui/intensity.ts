/**
 * Échelle d'intensité commune au web et au mobile (RM9) : quatre niveaux, chacun porté par
 * les tokens `--ath-rpe-<niveau>-bg` / `--ath-rpe-<niveau>-text` de `tokens.scss`, seul
 * dégradé admis par la charte.
 *
 * - RPE (1 à 10) : 1–3 facile, 4–6 modéré, 7–8 difficile, 9–10 maximal (découpage des tokens).
 * - Fatigue (1 à 5) : même rampe, sans nouveau token : 1–2 basse, 3 moyenne, 4 élevée,
 *   5 très élevée. Une fatigue forte se lit donc comme un effort fort.
 */
export type IntensityLevel = 'easy' | 'moderate' | 'hard' | 'max';

export const RPE_MAX = 10;
export const FATIGUE_MAX = 5;

export function rpeLevel(rpe: number): IntensityLevel {
  if (rpe <= 3) {
    return 'easy';
  }
  if (rpe <= 6) {
    return 'moderate';
  }
  return rpe <= 8 ? 'hard' : 'max';
}

const RPE_LABELS: Record<IntensityLevel, string> = {
  easy: 'facile',
  moderate: 'modéré',
  hard: 'difficile',
  max: 'maximal',
};

/** « difficile » pour un RPE de 8. */
export function rpeLabel(rpe: number): string {
  return RPE_LABELS[rpeLevel(rpe)];
}

export function fatigueLevel(fatigue: number): IntensityLevel {
  if (fatigue <= 2) {
    return 'easy';
  }
  if (fatigue === 3) {
    return 'moderate';
  }
  return fatigue === 4 ? 'hard' : 'max';
}

const FATIGUE_LABELS = ['très basse', 'basse', 'moyenne', 'élevée', 'très élevée'];

/** « élevée » pour une fatigue de 4. */
export function fatigueLabel(fatigue: number): string {
  return FATIGUE_LABELS[Math.min(Math.max(fatigue, 1), FATIGUE_MAX) - 1];
}
