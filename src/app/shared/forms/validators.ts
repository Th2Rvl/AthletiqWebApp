import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Longueur comprise entre `min` et `max` **après trim**, comme la validation de l'API qui
 * normalise avant de contrôler (RM2). `Validators.minLength` compterait les espaces :
 * « ␣␣a␣␣ » passerait côté web puis serait refusé par l'API.
 * Une valeur vide après trim produit l'erreur `required`, sauf si `min` vaut 0 (champ facultatif).
 */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const length = (control.value ?? '').trim().length;
    if (length === 0) {
      return min > 0 ? { required: true } : null;
    }
    if (length < min || length > max) {
      return { trimmedLength: { min, max, actual: length } };
    }
    return null;
  };
}
