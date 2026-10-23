import { MuscleGroup } from '../../core/api/models/api.models';

/** Libellés français des groupes musculaires, dans l'ordre du formulaire et du filtre. */
export const MUSCLE_GROUP_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: 'PECTORAUX', label: 'Pectoraux' },
  { value: 'DOS', label: 'Dos' },
  { value: 'EPAULES', label: 'Épaules' },
  { value: 'BICEPS', label: 'Biceps' },
  { value: 'TRICEPS', label: 'Triceps' },
  { value: 'AVANT_BRAS', label: 'Avant-bras' },
  { value: 'ABDOMINAUX', label: 'Abdominaux' },
  { value: 'QUADRICEPS', label: 'Quadriceps' },
  { value: 'ISCHIO_JAMBIERS', label: 'Ischio-jambiers' },
  { value: 'FESSIERS', label: 'Fessiers' },
  { value: 'MOLLETS', label: 'Mollets' },
  { value: 'CORPS_ENTIER', label: 'Corps entier' },
];

/** Libellé d'un groupe musculaire, ou la valeur brute si elle est inconnue. */
export function muscleGroupLabel(value: MuscleGroup): string {
  return MUSCLE_GROUP_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
