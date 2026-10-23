import { IsoDate } from '../../core/api/models/api.models';

/**
 * Jours sans heure « AAAA-MM-JJ » (contrat #6, Q12). Les calculs passent par `Date.UTC` dans
 * les deux sens (lecture et écriture en UTC) : aucun fuseau local n'intervient, donc aucun
 * décalage d'un jour. On n'utilise jamais `toISOString()` sur une date locale.
 */

/** Fuseau de référence d'Athletiq, identique à l'API (`athletiq.planning.zone`) et au mobile. */
export const PLANNING_TIME_ZONE = 'Europe/Paris';
/** Q8 : le calendrier montre 4 semaines glissantes du lundi au dimanche. */
export const CALENDAR_WEEKS = 4;
/** Duplication : 1 à 12 semaines (contrat §4.9). */
export const DUPLICATE_WEEKS_MIN = 1;
export const DUPLICATE_WEEKS_MAX = 12;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Vrai si la chaîne est une date réelle au format « AAAA-MM-JJ » (31 février refusé). */
export function isIsoDate(value: string | null | undefined): value is IsoDate {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function toUtc(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(date: Date): IsoDate {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(new Date(toUtc(date).getTime() + days * DAY_MS));
}

/** Jour de la semaine, 0 = lundi … 6 = dimanche. */
export function dayOfWeek(date: IsoDate): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -dayOfWeek(date));
}

export function isMonday(date: IsoDate): boolean {
  return dayOfWeek(date) === 0;
}

/**
 * « Aujourd'hui » dans le fuseau de référence, pour choisir la période affichée avant la
 * première réponse. La mise en évidence et les jours passés s'appuient ensuite sur `today`
 * renvoyé par l'API (contrat §5.1).
 */
export function todayIn(timeZone = PLANNING_TIME_ZONE, now = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Semaines de la période : `weekCount` listes de 7 jours, à partir du lundi `start`. */
export function calendarWeeks(start: IsoDate, weekCount = CALENDAR_WEEKS): IsoDate[][] {
  const monday = mondayOf(start);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(monday, week * 7 + day)),
  );
}

/** Bornes incluses de la période de `weekCount` semaines qui commence au lundi `start`. */
export function periodOf(start: IsoDate, weekCount = CALENDAR_WEEKS): { from: IsoDate; to: IsoDate } {
  const from = mondayOf(start);
  return { from, to: addDays(from, weekCount * 7 - 1) };
}

/**
 * Formate un jour en français. Le jour est lu et écrit en UTC : le libellé ne dépend pas du
 * fuseau du navigateur.
 */
export function formatDay(date: IsoDate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(toUtc(date));
}

/** « jeudi 12 novembre 2026 » */
export function longDay(date: IsoDate): string {
  return formatDay(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** « 2 nov. – 29 nov. 2026 », ou « 28 déc. 2026 – 24 janv. 2027 » à cheval sur deux années. */
export function periodLabel(from: IsoDate, to: IsoDate): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const start = formatDay(from, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  const end = formatDay(to, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

/**
 * Date locale (minuit, fuseau du navigateur) pour `p-datepicker`, qui manipule des `Date`.
 * Le passage par les composantes locales garde le même jour affiché.
 */
export function toPickerDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Jour choisi dans `p-datepicker`, lu dans ses composantes locales (jamais `toISOString`). */
export function fromPickerDate(date: Date): IsoDate {
  return [
    date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('-');
}
