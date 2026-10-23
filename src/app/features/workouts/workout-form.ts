import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ExerciseRef, PlannedSet } from '../../core/api/models/api.models';

/** Bornes du contrat #5 (§4 et §10), identiques à la validation de l'API. */
export const WORKOUT_NAME_MAX = 100;
export const WORKOUT_DESCRIPTION_MAX = 1000;
export const WORKOUT_NOTE_MAX = 500;
export const WORKOUT_EXERCISES_MAX = 30;
export const WORKOUT_SETS_MAX = 20;
export const REPS_MIN = 1;
export const REPS_MAX = 100;
export const LOAD_MAX = 999.5;
export const LOAD_STEP = 0.5;
export const REST_MAX = 600;

export type SetForm = FormGroup<{
  reps: FormControl<number | null>;
  loadKg: FormControl<number | null>;
  restSeconds: FormControl<number | null>;
}>;

export type WorkoutExerciseForm = FormGroup<{
  /** Clé locale de suivi de liste : l'API n'expose pas d'identifiant d'exercice de séance. */
  key: FormControl<number>;
  exercise: FormControl<ExerciseRef>;
  note: FormControl<string>;
  sets: FormArray<SetForm>;
}>;

/** Valeurs d'une série, telles que saisies (ou proposées par « N séries identiques »). */
export interface SetValues {
  reps: number | null;
  loadKg: number | null;
  restSeconds: number | null;
}

/** Demande « N séries identiques » (Q1) : `count` séries avec les mêmes valeurs. */
export interface BulkSets extends SetValues {
  count: number;
}

/** Entier, vérifié seulement si la valeur est renseignée (`required` s'en charge sinon). */
export function integer(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value === null || Number.isInteger(value) ? null : { integer: true };
}

/** Multiple de 0,5 kg (`@HalfKgStep` côté API) ; une charge vide (poids du corps) est valide. */
export function halfKgStep(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value === null || Number.isInteger(value / LOAD_STEP) ? null : { halfKgStep: true };
}

/** Taille d'un `FormArray` comprise entre `min` et `max` (1..30 exercices, 1..20 séries). */
export function arrayLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = (control as FormArray).length;
    if (length < min) {
      return { arrayMin: { min, actual: length } };
    }
    return length > max ? { arrayMax: { max, actual: length } } : null;
  };
}

export function createSetForm(values: SetValues): SetForm {
  return new FormGroup({
    reps: new FormControl<number | null>(values.reps, [
      Validators.required,
      Validators.min(REPS_MIN),
      Validators.max(REPS_MAX),
      integer,
    ]),
    loadKg: new FormControl<number | null>(values.loadKg, [
      Validators.min(0),
      Validators.max(LOAD_MAX),
      halfKgStep,
    ]),
    restSeconds: new FormControl<number | null>(values.restSeconds, [
      Validators.min(0),
      Validators.max(REST_MAX),
      integer,
    ]),
  });
}

export function createExerciseForm(
  key: number,
  exercise: ExerciseRef,
  note: string | null,
  sets: (SetValues | PlannedSet)[],
): WorkoutExerciseForm {
  return new FormGroup({
    key: new FormControl(key, { nonNullable: true }),
    exercise: new FormControl(exercise, { nonNullable: true }),
    note: new FormControl(note ?? '', { nonNullable: true }),
    sets: new FormArray(
      sets.map((set) =>
        createSetForm({ reps: set.reps, loadKg: set.loadKg, restSeconds: set.restSeconds }),
      ),
      [arrayLength(1, WORKOUT_SETS_MAX)],
    ),
  });
}

/** Message d'erreur d'un champ de série, d'après les erreurs de son contrôle. */
export function setFieldError(
  field: keyof SetValues,
  errors: ValidationErrors | null,
): string | null {
  if (!errors) {
    return null;
  }
  switch (field) {
    case 'reps':
      return errors['required']
        ? 'Les répétitions sont obligatoires'
        : `Entre ${REPS_MIN} et ${REPS_MAX} répétitions, nombre entier`;
    case 'loadKg':
      if (errors['min']) {
        return 'La charge ne peut pas être négative';
      }
      return errors['max'] ? 'La charge ne doit pas dépasser 999,5 kg' : 'Multiple de 0,5 kg';
    case 'restSeconds':
      return `Entre 0 et ${REST_MAX} secondes, nombre entier`;
  }
}

/** Repos affiché en mm:ss (Q4) : 90 → « 1:30 ». */
export function formatRest(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
