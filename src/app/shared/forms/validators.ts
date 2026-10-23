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

/**
 * Robustesse du mot de passe (RM2) : au moins 12 caractères, une lettre et un chiffre.
 * Même règle que l'API, qui reste la source de vérité : le web aligne son message, il ne
 * remplace pas le contrôle du serveur.
 */
export function passwordStrength(control: AbstractControl<string | null>): ValidationErrors | null {
  const password = control.value ?? '';
  if (password.length === 0) {
    return null;
  }
  const errors: ValidationErrors = {};
  if (password.length < 12) {
    errors['passwordLength'] = { min: 12, actual: password.length };
  }
  if (!/\p{L}/u.test(password)) {
    errors['passwordLetter'] = true;
  }
  if (!/\d/.test(password)) {
    errors['passwordDigit'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Adresse web `http` ou `https` absolue, vérifiée après trim. Une valeur vide n'est pas
 * contrôlée ici : un champ facultatif se combine avec `trimmedLength(0, max)`.
 */
export function httpUrl(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (value.length === 0) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { httpUrl: true };
  } catch {
    return { httpUrl: true };
  }
}
