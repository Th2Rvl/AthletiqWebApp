import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem } from './models/api.models';

/**
 * Libellés affichés par le front, choisis d'après le `code` de l'erreur et jamais d'après
 * son `detail` (contrat §3) : le texte de l'API peut changer sans casser l'interface.
 */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect',
  ORGANISATION_NAME_TAKEN: 'Une organisation porte déjà ce nom',
  ORGANISATION_NOT_FOUND: "Cette organisation n'existe plus",
  COACH_NOT_MEMBER: "Ce coach ne fait plus partie de l'organisation",
  COACH_ALREADY_MEMBER: "Ce coach fait déjà partie de l'organisation",
  INVITATION_ALREADY_PENDING: 'Une invitation est déjà en attente pour cet e-mail',
  ACCOUNT_NOT_COACH: "Ce compte n'est pas un compte coach",
  INVITATION_NOT_FOUND: "Cette invitation n'existe plus",
  ATHLETE_NOT_FOUND: "Cet athlète n'est plus suivi",
  GROUP_NOT_FOUND: "Ce groupe n'existe plus",
  GROUP_MEMBER_NOT_FOUND: "Cet athlète n'est pas dans ce groupe",
  GROUP_NAME_ALREADY_EXISTS: 'Vous avez déjà un groupe de ce nom',
  ACCESS_DENIED: "Vous n'avez pas accès à cette ressource",
  INVITATION_NOT_PENDING: "Cette invitation n'est plus en attente",
  EMAIL_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail',
  PASSWORD_RULE_VIOLATION:
    'Le mot de passe doit contenir au moins 12 caractères, une lettre et un chiffre',
  RESET_TOKEN_INVALID: 'Ce lien de réinitialisation n\'est plus valable',
  PASSWORD_CONFIRMATION_MISMATCH: 'Les deux mots de passe ne correspondent pas',
  EXERCISE_NOT_FOUND: "Un exercice de la séance n'existe plus",
  EXERCISE_NAME_ALREADY_EXISTS: 'Vous avez déjà un exercice de ce nom',
  EXERCISE_IN_USE: 'Cet exercice est utilisé dans une séance',
  WORKOUT_NOT_FOUND: "Cette séance n'existe plus",
  WORKOUT_NAME_ALREADY_EXISTS: 'Vous avez déjà une séance de ce nom',
};

const UNREACHABLE = 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.';
const UNEXPECTED = "Une erreur inattendue s'est produite. Réessayez dans un instant.";

/** Extrait le `ProblemDetail` d'une erreur HTTP, ou `null` si le corps n'en est pas un. */
export function toApiProblem(error: unknown): ApiProblem | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = error.error;
  if (body && typeof body === 'object' && typeof (body as ApiProblem).code === 'string') {
    return body as ApiProblem;
  }
  return null;
}

/** Statut HTTP de l'erreur, ou `null` si ce n'est pas une erreur HTTP. */
export function httpStatus(error: unknown): number | null {
  return error instanceof HttpErrorResponse ? error.status : null;
}

/** Code métier de l'erreur, s'il y en a un. */
export function problemCode(error: unknown): string | null {
  return toApiProblem(error)?.code ?? null;
}

/** Message à afficher pour une erreur qui n'est pas rattachée à un champ. */
export function problemMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return UNREACHABLE;
  }
  const problem = toApiProblem(error);
  if (problem?.code === 'EXERCISE_IN_USE') {
    return exerciseInUseMessage(problem.workoutCount);
  }
  return (problem && MESSAGES[problem.code]) || UNEXPECTED;
}

/**
 * Libellé de `409 EXERCISE_IN_USE` construit avec `workoutCount` (contrat #5, §10) :
 * « Cet exercice est utilisé dans 3 séances ». Sans compte exploitable, libellé générique.
 */
export function exerciseInUseMessage(workoutCount: number | undefined): string {
  if (typeof workoutCount !== 'number' || workoutCount < 1) {
    return MESSAGES['EXERCISE_IN_USE'];
  }
  return workoutCount === 1
    ? 'Cet exercice est utilisé dans 1 séance'
    : `Cet exercice est utilisé dans ${workoutCount} séances`;
}

/**
 * Erreurs à afficher sous les champs d'un formulaire, par nom de champ JSON :
 * `errors[]` d'un 400 de validation, ou `field` d'un 409 de règle métier.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  const problem = toApiProblem(error);
  if (!problem) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const item of problem.errors ?? []) {
    result[item.field] ??= item.message;
  }
  if (problem.field) {
    result[problem.field] = MESSAGES[problem.code] ?? problem.detail;
  }
  return result;
}
