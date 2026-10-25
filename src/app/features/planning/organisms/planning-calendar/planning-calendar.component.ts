import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { IsoDate, SessionStatus } from '../../../../core/api/models/api.models';
import { sessionStatusLabel } from '../../../../shared/ui/session-status';
import { PlannedSessionChipComponent } from '../../molecules/planned-session-chip/planned-session-chip.component';
import {
  CALENDAR_WEEKS,
  calendarWeeks,
  formatDay,
  isoWeek,
  longDay,
  weekRangeLabel,
} from '../../planning-dates';

/**
 * Une séance (athlète) ou un regroupement de séances (groupe) à placer dans une case.
 * `key` est rendu tel quel par `open` : la page sait à quoi il correspond.
 */
export interface CalendarItem {
  key: string;
  date: IsoDate;
  name: string;
  /** Précision courte : « 5 exercices, 15 séries » ou « 3/4 athlètes ». */
  meta: string | null;
  locked: boolean;
  /** Statut de la séance (#7) ; pour un groupe, celui de l'ensemble de ses séances. */
  status: SessionStatus;
  /** État affiché à la place du statut (groupe : « 2/3 réalisées »). */
  stateLabel?: string | null;
}

interface CalendarDay {
  date: IsoDate;
  index: number;
  dayLabel: string;
  longLabel: string;
  isToday: boolean;
  isPast: boolean;
  canPlan: boolean;
  items: CalendarItem[];
}

interface CalendarWeek {
  monday: IsoDate;
  /** Numéro de semaine ISO, « Sem. 43 ». */
  number: number;
  /** « 19 – 25 oct. » */
  range: string;
  days: CalendarDay[];
}

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const SKELETON_DAYS = new Set([1, 3, 8, 12, 16, 19, 24]);

/**
 * Calendrier de planification (planche W4) : 4 semaines du lundi au dimanche (Q8), une
 * colonne de semaine (« Sem. 43 », « 19 – 25 oct. »), chaque case listant 0 à n séances
 * (décision du PO, Q1) et, pour un jour qui n'est pas passé, l'action « Planifier »
 * (conservée, décision #70). Le jour courant occupe toute sa case en primary-soft.
 *
 * Organisme maison : PrimeNG n'a pas de calendrier de planification. `p-datepicker` choisit
 * une date mais n'affiche pas de contenu par jour, et `p-table` ne donne pas une grille de
 * jours. La grille est en CSS grid sur les tokens `--ath-*`, avec les rôles ARIA d'une
 * grille et un déplacement au clavier entre les jours (flèches, Début, Fin).
 *
 * « Aujourd'hui » vient de l'API (`today`), jamais de l'horloge du navigateur.
 */
@Component({
  selector: 'app-planning-calendar',
  imports: [ButtonModule, SkeletonModule, PlannedSessionChipComponent],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './planning-calendar.component.html',
  styleUrl: './planning-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningCalendarComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Premier jour affiché (ramené au lundi). */
  readonly start = input.required<IsoDate>();
  /** Aujourd'hui selon l'API ; `null` tant que la première réponse n'est pas arrivée. */
  readonly today = input<IsoDate | null>(null);
  readonly items = input<CalendarItem[]>([]);
  readonly loading = input(false);
  /** Faux quand la planification est impossible (aucune séance, groupe vide…). */
  readonly canPlan = input(true);
  readonly weekCount = input(CALENDAR_WEEKS);
  /** Nom de la cible, pour le libellé accessible de la grille. */
  readonly label = input('Calendrier de planification');

  readonly plan = output<IsoDate>();
  readonly open = output<string>();

  protected readonly weekdays = WEEKDAYS;

  protected readonly weeks = computed<CalendarWeek[]>(() => {
    const today = this.today();
    const byDate = new Map<IsoDate, CalendarItem[]>();
    for (const item of this.items()) {
      const list = byDate.get(item.date) ?? [];
      list.push(item);
      byDate.set(item.date, list);
    }
    let index = 0;
    return calendarWeeks(this.start(), this.weekCount()).map((week) => ({
      monday: week[0],
      number: isoWeek(week[0]),
      range: weekRangeLabel(week[0]),
      days: week.map((date) => {
        const isPast = today !== null && date < today;
        return {
          date,
          index: index++,
          dayLabel: this.dayLabel(date, index === 1),
          longLabel: longDay(date),
          isToday: date === today,
          isPast,
          canPlan: this.canPlan() && today !== null && !isPast,
          items: byDate.get(date) ?? [],
        };
      }),
    }));
  });

  protected skeleton(day: CalendarDay): boolean {
    return SKELETON_DAYS.has(day.index);
  }

  protected chipLabel(item: CalendarItem, day: CalendarDay): string {
    const state = item.stateLabel ?? sessionStatusLabel(item.status);
    return [item.name, day.longLabel, item.meta, state.toLowerCase()]
      .filter((part) => part)
      .join(', ');
  }

  /** Flèches : jour voisin ; haut et bas : même jour de la semaine voisine ; Début et Fin : la ligne. */
  protected onKeydown(event: KeyboardEvent): void {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-day-index]');
    if (!cell) {
      return;
    }
    const current = Number(cell.dataset['dayIndex']);
    const last = this.weekCount() * 7 - 1;
    const rowStart = current - (current % 7);
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - 7,
      ArrowDown: current + 7,
      Home: rowStart,
      End: rowStart + 6,
    };
    const target = moves[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    if (target < 0 || target > last) {
      return;
    }
    this.host.nativeElement.querySelector<HTMLElement>(`[data-day-index="${target}"]`)?.focus();
  }

  /** Numéro du jour ; le mois est précisé le 1er et sur la première case. */
  private dayLabel(date: IsoDate, first: boolean): string {
    return first || date.endsWith('-01')
      ? formatDay(date, { day: 'numeric', month: 'short' })
      : formatDay(date, { day: 'numeric' });
  }
}
