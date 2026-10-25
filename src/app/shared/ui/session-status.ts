import { SessionStatus } from '../../core/api/models/api.models';

/** Sévérité `p-tag` du preset Athletiq : `success`, `danger` et `secondary` en tons doux. */
export type StatusSeverity = 'success' | 'danger' | 'secondary';

/**
 * Code visuel commun d'une séance (skill front-angular-atomic-design §6, même badge que
 * l'app mobile) : « Réalisée » en succès, « Non faite » en danger, « Planifiée » en neutre.
 * `p-tag` suffit à l'afficher ; ce fichier fixe seulement le libellé et la sévérité, pour
 * qu'ils soient identiques dans le calendrier, l'historique et le détail.
 */
export const SESSION_STATUS_TAGS: Record<
  SessionStatus,
  { label: string; severity: StatusSeverity }
> = {
  DONE: { label: 'Réalisée', severity: 'success' },
  MISSED: { label: 'Non faite', severity: 'danger' },
  UPCOMING: { label: 'Planifiée', severity: 'secondary' },
};

export function sessionStatusLabel(status: SessionStatus): string {
  return SESSION_STATUS_TAGS[status].label;
}

export function sessionStatusSeverity(status: SessionStatus): StatusSeverity {
  return SESSION_STATUS_TAGS[status].severity;
}
