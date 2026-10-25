import { WatchReason } from '../../core/api/models/api.models';

const DECIMAL = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** « 82 % » ; « – » sans séance passée (division par zéro côté API, RM8). */
export function formatRate(rate: number | null): string {
  return rate === null ? '–' : `${rate} %`;
}

/** « 7,2 » ; « – » sans séance réalisée avec RPE. */
export function formatRpe(rpe: number | null): string {
  return rpe === null ? '–' : DECIMAL.format(rpe);
}

/**
 * Motif « À surveiller » en clair. Les seuils (1 non faite sur 7 jours, taux sous 70 % avec
 * au moins 3 séances passées) sont réglés côté API (`athletiq.kpi.*`) : le libellé n'en
 * recopie pas les valeurs, il les décrit.
 */
export function watchReasonLabel(reason: WatchReason, missedLast7Days: number): string {
  if (reason === 'MISSED_RECENTLY') {
    return missedLast7Days > 1
      ? `${missedLast7Days} non faites ces 7 derniers jours`
      : 'Non faite ces 7 derniers jours';
  }
  return 'Taux de réalisation bas';
}
