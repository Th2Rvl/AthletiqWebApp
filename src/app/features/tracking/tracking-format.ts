import { IsoDate, IsoInstant } from '../../core/api/models/api.models';
import { PLANNING_TIME_ZONE, addDays, formatDay } from '../planning/planning-dates';

/** Périodes proposées dans l'historique, en semaines qui finissent aujourd'hui (4 par défaut). */
export const HISTORY_WEEKS = [4, 12, 26, 52];
export const DEFAULT_HISTORY_WEEKS = 4;

/**
 * Bornes incluses des `weeks` dernières semaines qui finissent `today` : 4 semaines donnent
 * `today - 27 j` comme le défaut de l'API, 52 semaines `today - 363 j` (plafond : 364 j).
 */
export function lastWeeks(today: IsoDate, weeks: number): { from: IsoDate; to: IsoDate } {
  return { from: addDays(today, -(weeks * 7 - 1)), to: today };
}

/** « jeu. 12 nov. 2026 » : jour d'une ligne d'historique. */
export function shortDay(date: IsoDate): string {
  return formatDay(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const INSTANT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: PLANNING_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** « 12 novembre 2026 à 18:42 », à l'heure de Paris quel que soit le fuseau du navigateur. */
export function formatInstant(instant: IsoInstant): string {
  return INSTANT.format(new Date(instant));
}

const KG = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** « 62,5 kg » ; « 1 240 kg » pour un volume. */
export function formatKg(value: number): string {
  return `${KG.format(value)} kg`;
}

/** « 8 × 62,5 kg », ou « 8 rép. » au poids du corps (charge vide). */
export function formatSet(reps: number, loadKg: number | null): string {
  return loadKg === null ? `${reps} rép.` : `${reps} × ${formatKg(loadKg)}`;
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}
