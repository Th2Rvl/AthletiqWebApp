import { ConfirmationService } from 'primeng/api';
import { Organisation } from '../../../core/api/models/api.models';

/**
 * Confirmation de suppression d'une organisation (US02), partagée par la liste et la fiche.
 * Le message rappelle le nombre de coachs rattachés, qui vient de la ligne affichée.
 */
export function confirmOrganisationDeletion(
  confirmation: ConfirmationService,
  organisation: Organisation,
  accept: () => void,
): void {
  const coaches = organisation.coachCount;
  const attached =
    coaches === 0
      ? "Aucun coach n'y est rattaché."
      : coaches === 1
        ? '1 coach y est rattaché : il sera détaché, son compte est conservé.'
        : `${coaches} coachs y sont rattachés : ils seront détachés, leurs comptes sont conservés.`;
  confirmation.confirm({
    header: `Supprimer « ${organisation.name} » ?`,
    message: `${attached} Les invitations en attente seront supprimées. Cette action est définitive.`,
    acceptLabel: "Supprimer l'organisation",
    rejectLabel: 'Annuler',
    acceptButtonProps: { label: "Supprimer l'organisation", severity: 'danger' },
    rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
    defaultFocus: 'reject',
    accept,
  });
}
