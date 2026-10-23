import { ConfirmationService } from 'primeng/api';
import { Group } from '../../../core/api/models/api.models';

/**
 * Confirmation de suppression d'un groupe (US13), partagée par la liste et la fiche.
 * Elle rappelle le nombre d'athlètes du groupe, qui viennent de la ligne affichée.
 */
export function confirmGroupDeletion(
  confirmation: ConfirmationService,
  group: Group,
  accept: () => void,
): void {
  const count = group.athleteCount;
  const members =
    count === 0
      ? "Aucun athlète n'y figure."
      : count === 1
        ? '1 athlète y figure : il reste suivi, il est seulement retiré du groupe.'
        : `${count} athlètes y figurent : ils restent suivis, ils sont seulement retirés du groupe.`;
  confirmation.confirm({
    header: `Supprimer « ${group.name} » ?`,
    message: `${members} Cette action est définitive.`,
    acceptLabel: 'Supprimer le groupe',
    rejectLabel: 'Annuler',
    acceptButtonProps: { label: 'Supprimer le groupe', severity: 'danger' },
    rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
    defaultFocus: 'reject',
    accept,
  });
}
