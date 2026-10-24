import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { Observable, Subscription } from 'rxjs';
import { AthleteApiService } from '../../../../core/api/athlete-api.service';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import { GroupApiService } from '../../../../core/api/group-api.service';
import {
  AthleteCalendar,
  CreatedCount,
  DuplicateWeekPayload,
  GroupCalendar,
  GroupCalendarEntry,
  IsoDate,
  PlanSessionPayload,
  PlannedSessionDetail,
  Uuid,
} from '../../../../core/api/models/api.models';
import { PlanningApiService } from '../../../../core/api/planning-api.service';
import { WorkoutApiService } from '../../../../core/api/workout-api.service';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import {
  PlanningTarget,
  PlanningTargetOption,
  PlanningTargetPickerComponent,
} from '../../molecules/planning-target-picker/planning-target-picker.component';
import { WeekNavigatorComponent } from '../../molecules/week-navigator/week-navigator.component';
import {
  DuplicateWeekFormComponent,
  WeekOption,
} from '../../organisms/duplicate-week-form/duplicate-week-form.component';
import { GroupSessionListComponent } from '../../organisms/group-session-list/group-session-list.component';
import {
  PlanSessionFormComponent,
  WorkoutOption,
} from '../../organisms/plan-session-form/plan-session-form.component';
import { PlannedSessionDetailComponent } from '../../organisms/planned-session-detail/planned-session-detail.component';
import {
  CalendarItem,
  PlanningCalendarComponent,
} from '../../organisms/planning-calendar/planning-calendar.component';
import {
  CALENDAR_WEEKS,
  addDays,
  calendarWeeks,
  formatDay,
  isIsoDate,
  longDay,
  mondayOf,
  periodLabel,
  periodOf,
  todayIn,
} from '../../planning-dates';

/** Le contrat plafonne `size` à 100 : le sélecteur propose les 100 premiers (tri par nom). */
const LIST_SIZE = 100;

/**
 * Page « Planification » (US21 à US26, planche W4) : calendrier de 4 semaines d'un athlète ou d'un groupe,
 * planification, détail, déplacement, annulation et duplication de semaine.
 *
 * Routes : `/planning`, `/planning/athletes/:athleteId`, `/planning/groupes/:groupId`, avec
 * `?debut=AAAA-MM-JJ` pour garder la période dans l'URL. Seule à injecter les services.
 *
 * « Aujourd'hui » vient du champ `today` des réponses de l'API. Avant la première réponse, et
 * sans `debut`, la période part de la date du jour à Paris (`todayIn`), recalée ensuite sur
 * `today` si elle diffère.
 */
@Component({
  selector: 'app-planning-page',
  imports: [
    RouterLink,
    ButtonModule,
    DialogModule,
    MessageModule,
    EmptyStateComponent,
    ErrorStateComponent,
    PageHeaderComponent,
    PlanningTargetPickerComponent,
    WeekNavigatorComponent,
    PlanningCalendarComponent,
    PlanSessionFormComponent,
    PlannedSessionDetailComponent,
    GroupSessionListComponent,
    DuplicateWeekFormComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './planning-page.component.html',
  styleUrl: './planning-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningPageComponent {
  private readonly api = inject(PlanningApiService);
  private readonly athleteApi = inject(AthleteApiService);
  private readonly groupApi = inject(GroupApiService);
  private readonly workoutApi = inject(WorkoutApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètres de route et de requête, liés par `withComponentInputBinding()`. */
  readonly athleteId = input<string | undefined>();
  readonly groupId = input<string | undefined>();
  readonly debut = input<string | undefined>();

  // --- Cible et période ---

  protected readonly target = computed<PlanningTarget | null>(() => {
    const athleteId = this.athleteId();
    if (athleteId) {
      return { kind: 'athlete', id: athleteId };
    }
    const groupId = this.groupId();
    return groupId ? { kind: 'group', id: groupId } : null;
  });

  /** Aujourd'hui selon l'API (dernière réponse de calendrier). */
  protected readonly today = signal<IsoDate | null>(null);
  protected readonly start = computed<IsoDate>(() => {
    const debut = this.debut();
    return mondayOf(isIsoDate(debut) ? debut : (this.today() ?? todayIn()));
  });
  protected readonly period = computed(() => periodOf(this.start()));
  protected readonly periodText = computed(() => periodLabel(this.period().from, this.period().to));

  protected readonly athletes = signal<PlanningTargetOption[]>([]);
  protected readonly groups = signal<PlanningTargetOption[]>([]);
  protected readonly targetsLoaded = signal(false);
  protected readonly targetsError = signal<unknown>(null);
  protected readonly noTargetAtAll = computed(
    () => this.targetsLoaded() && this.athletes().length === 0 && this.groups().length === 0,
  );
  protected readonly targetName = computed(() => {
    const target = this.target();
    if (!target) {
      return '';
    }
    const list = target.kind === 'athlete' ? this.athletes() : this.groups();
    return (
      list.find((option) => option.id === target.id)?.label ??
      (target.kind === 'athlete' ? 'Athlète' : 'Groupe')
    );
  });
  /** « Lucas Durand » ou « groupe Demi-fond », dans les phrases des dialogues. */
  protected readonly targetPhrase = computed(() =>
    this.target()?.kind === 'group' ? `groupe ${this.targetName()}` : this.targetName(),
  );

  // --- Calendrier ---

  protected readonly athleteCalendar = signal<AthleteCalendar | null>(null);
  protected readonly groupCalendar = signal<GroupCalendar | null>(null);
  protected readonly calendarLoading = signal(false);
  protected readonly calendarError = signal<unknown>(null);
  protected readonly notFound = signal(false);
  protected readonly notFoundMessage = computed(() =>
    this.target()?.kind === 'group' ? "Ce groupe n'existe plus" : "Cet athlète n'est plus suivi",
  );
  private calendarRequest?: Subscription;

  protected readonly items = computed<CalendarItem[]>(() => {
    const athlete = this.athleteCalendar();
    if (athlete) {
      return athlete.sessions.map((session) => ({
        key: session.id,
        date: session.date,
        name: session.name,
        meta: `${plural(session.exerciseCount, 'exercice', 'exercices')}, ${plural(session.setCount, 'série', 'séries')}`,
        locked: session.locked,
      }));
    }
    return (this.groupCalendar()?.entries ?? []).map((entry) => ({
      key: entryKey(entry),
      date: entry.date,
      name: entry.name,
      meta: `${entry.athleteCount}/${entry.memberCount} ${entry.memberCount > 1 ? 'athlètes' : 'athlète'}`,
      locked: entry.locked,
    }));
  });
  protected readonly calendarLoaded = computed(
    () => this.athleteCalendar() !== null || this.groupCalendar() !== null,
  );
  protected readonly calendarEmpty = computed(
    () => this.calendarLoaded() && !this.calendarLoading() && this.items().length === 0,
  );
  /** Groupe sans membre : rien à planifier ni à dupliquer (`409 GROUP_HAS_NO_MEMBERS`). */
  protected readonly groupWithoutMembers = computed(() => this.groupCalendar()?.memberCount === 0);
  /** Les actions de l'en-tête n'ont de sens qu'avec un calendrier affiché. */
  protected readonly showCalendar = computed(
    () => this.target() !== null && !this.notFound() && this.calendarError() === null,
  );
  /** « 6 athlètes » à côté du groupe choisi (planche W4). */
  protected readonly memberCountText = computed(() => {
    const count = this.groupCalendar()?.memberCount;
    if (this.target()?.kind !== 'group' || count === undefined) {
      return null;
    }
    return `· ${count} ${count > 1 ? 'athlètes' : 'athlète'}`;
  });
  protected readonly canPlan = computed(
    () => this.calendarLoaded() && this.today() !== null && !this.groupWithoutMembers(),
  );
  protected readonly weekOptions = computed<WeekOption[]>(() => {
    const items = this.items();
    return calendarWeeks(this.start(), CALENDAR_WEEKS).map((week) => ({
      weekStart: week[0],
      label: `Semaine du ${formatDay(week[0], { day: 'numeric', month: 'long', year: 'numeric' })}`,
      sessionCount: items.filter((item) => item.date >= week[0] && item.date <= week[6]).length,
    }));
  });
  /** Semaine proposée pour la duplication : celle d'aujourd'hui si elle est affichée. */
  protected readonly defaultSourceWeek = computed(() => {
    const today = this.today();
    return today ? mondayOf(today) : this.start();
  });

  // --- Planifier ---

  protected readonly planVisible = signal(false);
  protected readonly planDate = signal<IsoDate | null>(null);
  protected readonly planning = signal(false);
  protected readonly planErrors = signal<Record<string, string>>({});
  protected readonly planError = signal<string | null>(null);
  protected readonly workouts = signal<WorkoutOption[]>([]);
  protected readonly workoutsLoaded = signal(false);
  protected readonly workoutsError = signal<unknown>(null);

  // --- Détail, déplacement, annulation ---

  protected readonly detailVisible = signal(false);
  protected readonly detail = signal<PlannedSessionDetail | null>(null);
  protected readonly detailError = signal<unknown>(null);
  protected readonly detailSaving = signal(false);
  protected readonly detailErrors = signal<Record<string, string>>({});
  private detailId: Uuid | null = null;
  private detailRequest?: Subscription;

  protected readonly groupEntry = signal<GroupCalendarEntry | null>(null);

  // --- Dupliquer ---

  protected readonly duplicateVisible = signal(false);
  protected readonly duplicating = signal(false);
  protected readonly duplicateErrors = signal<Record<string, string>>({});
  protected readonly duplicateError = signal<string | null>(null);

  constructor() {
    this.loadTargets();
    effect(() => {
      this.target();
      this.period();
      untracked(() => this.loadCalendar());
    });
    this.destroyRef.onDestroy(() => {
      this.calendarRequest?.unsubscribe();
      this.detailRequest?.unsubscribe();
    });
  }

  // --- Chargements ---

  protected loadTargets(): void {
    this.targetsError.set(null);
    this.athleteApi
      .list({ page: 0, size: LIST_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.athletes.set(
            page.content.map((athlete) => ({
              id: athlete.id,
              label: `${athlete.firstName} ${athlete.lastName}`,
            })),
          );
          this.loadGroups();
        },
        error: (error: unknown) => this.targetsError.set(error),
      });
  }

  private loadGroups(): void {
    this.groupApi
      .list({ page: 0, size: LIST_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.groups.set(page.content.map((group) => ({ id: group.id, label: group.name })));
          this.targetsLoaded.set(true);
        },
        error: (error: unknown) => this.targetsError.set(error),
      });
  }

  protected loadCalendar(): void {
    this.calendarRequest?.unsubscribe();
    const target = this.target();
    this.notFound.set(false);
    this.calendarError.set(null);
    if (!target) {
      this.athleteCalendar.set(null);
      this.groupCalendar.set(null);
      this.calendarLoading.set(false);
      return;
    }
    const { from, to } = this.period();
    this.calendarLoading.set(true);
    const request: Observable<AthleteCalendar | GroupCalendar> =
      target.kind === 'athlete'
        ? this.api.athleteCalendar(target.id, from, to)
        : this.api.groupCalendar(target.id, from, to);
    this.calendarRequest = request.subscribe({
      next: (calendar) => {
        this.calendarLoading.set(false);
        if ('athleteId' in calendar) {
          this.groupCalendar.set(null);
          this.athleteCalendar.set(calendar);
        } else {
          this.athleteCalendar.set(null);
          this.groupCalendar.set(calendar);
        }
        // Peut décaler la période (sans `debut`) : l'effet recharge alors le calendrier.
        this.today.set(calendar.today);
      },
      error: (error: unknown) => {
        this.calendarLoading.set(false);
        this.athleteCalendar.set(null);
        this.groupCalendar.set(null);
        const code = problemCode(error);
        if (code === 'ATHLETE_NOT_FOUND' || code === 'GROUP_NOT_FOUND') {
          this.notFound.set(true);
        } else {
          this.calendarError.set(error);
        }
      },
    });
  }

  private loadWorkouts(): void {
    this.workoutsLoaded.set(false);
    this.workoutsError.set(null);
    this.workoutApi
      .list({ page: 0, size: LIST_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.workouts.set(
            page.content.map((workout) => ({ id: workout.id, name: workout.name })),
          );
          this.workoutsLoaded.set(true);
        },
        error: (error: unknown) => {
          this.workoutsError.set(error);
          this.workoutsLoaded.set(true);
        },
      });
  }

  protected retryWorkouts(): void {
    this.loadWorkouts();
  }

  protected errorText(error: unknown): string | null {
    return error ? problemMessage(error) : null;
  }

  // --- Navigation ---

  protected selectTarget(target: PlanningTarget): void {
    const segment = target.kind === 'athlete' ? 'athletes' : 'groupes';
    const debut = this.debut();
    void this.router.navigate(['/planning', segment, target.id], {
      queryParams: isIsoDate(debut) ? { debut } : {},
    });
  }

  protected shiftWeeks(weeks: number): void {
    this.navigateToStart(addDays(this.start(), weeks * 7));
  }

  protected goToToday(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private navigateToStart(debut: IsoDate): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { debut } });
  }

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  // --- Planifier (US21, US22) ---

  protected openPlan(date: IsoDate | null = null): void {
    const today = this.today();
    if (!this.canPlan() || today === null) {
      return;
    }
    this.planDate.set(date && date >= today ? date : today);
    this.planErrors.set({});
    this.planError.set(null);
    this.planVisible.set(true);
    if (!this.workoutsLoaded() || this.workoutsError()) {
      this.loadWorkouts();
    }
  }

  protected submitPlan(payload: PlanSessionPayload): void {
    const target = this.target();
    if (!target) {
      return;
    }
    this.planning.set(true);
    this.planErrors.set({});
    this.planError.set(null);
    const workoutName =
      this.workouts().find((workout) => workout.id === payload.workoutId)?.name ?? '';
    const request: Observable<PlannedSessionDetail | CreatedCount> =
      target.kind === 'athlete'
        ? this.api.planForAthlete(target.id, payload)
        : this.api.planForGroup(target.id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.planning.set(false);
        this.planVisible.set(false);
        const summary =
          'created' in result
            ? `Séance planifiée pour ${plural(result.created, 'athlète', 'athlètes')}`
            : 'Séance planifiée';
        this.messages.add({
          severity: 'success',
          summary,
          detail: `${workoutName}, ${longDay(payload.date)}`,
        });
        this.loadCalendar();
      },
      error: (error: unknown) => {
        this.planning.set(false);
        const code = problemCode(error);
        if (code === 'ATHLETE_NOT_FOUND' || code === 'GROUP_NOT_FOUND') {
          this.planVisible.set(false);
          this.notFound.set(true);
          return;
        }
        if (code === 'WORKOUT_NOT_FOUND') {
          // La séance a été supprimée entre-temps : la liste est rechargée.
          this.planError.set(problemMessage(error));
          this.loadWorkouts();
          return;
        }
        if (code === 'GROUP_HAS_NO_MEMBERS') {
          this.planVisible.set(false);
          this.messages.add({ severity: 'warn', summary: problemMessage(error) });
          this.loadCalendar();
          return;
        }
        const errors = fieldErrors(error);
        if (Object.keys(errors).length > 0) {
          this.planErrors.set(errors);
        } else {
          this.planError.set(problemMessage(error));
        }
      },
    });
  }

  // --- Détail (US24), déplacer et annuler (US25) ---

  protected openItem(key: string): void {
    if (this.athleteCalendar()) {
      this.openDetail(key);
      return;
    }
    const entry = this.groupCalendar()?.entries.find((candidate) => entryKey(candidate) === key);
    if (entry) {
      this.groupEntry.set(entry);
    }
  }

  protected openDetail(plannedSessionId: Uuid): void {
    this.groupEntry.set(null);
    this.detailId = plannedSessionId;
    this.detailErrors.set({});
    this.detailVisible.set(true);
    this.loadDetail();
  }

  protected loadDetail(): void {
    const id = this.detailId;
    if (!id) {
      return;
    }
    this.detailRequest?.unsubscribe();
    this.detail.set(null);
    this.detailError.set(null);
    this.detailRequest = this.api.get(id).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error: unknown) => {
        if (problemCode(error) === 'PLANNED_SESSION_NOT_FOUND') {
          this.onSessionGone(error);
        } else {
          this.detailError.set(error);
        }
      },
    });
  }

  protected closeDetail(): void {
    this.detailVisible.set(false);
    this.detailRequest?.unsubscribe();
    this.detailId = null;
  }

  protected moveSession(date: IsoDate): void {
    const current = this.detail();
    if (!current) {
      return;
    }
    this.detailSaving.set(true);
    this.detailErrors.set({});
    this.api
      .move(current.id, date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (moved) => {
          this.detailSaving.set(false);
          this.detail.set(moved);
          this.messages.add({
            severity: 'success',
            summary: 'Séance déplacée',
            detail: `${moved.name}, ${longDay(moved.date)}`,
          });
          this.loadCalendar();
        },
        error: (error: unknown) => {
          this.detailSaving.set(false);
          this.onDetailActionError(error);
        },
      });
  }

  protected confirmCancel(): void {
    const current = this.detail();
    if (!current) {
      return;
    }
    const athlete = `${current.athleteFirstName} ${current.athleteLastName}`;
    this.confirmation.confirm({
      header: 'Annuler la séance planifiée ?',
      message:
        `« ${current.name} » de ${athlete}, ${longDay(current.date)}, sera supprimée. ` +
        'Le modèle de séance est conservé.',
      acceptLabel: 'Annuler la séance',
      rejectLabel: 'Garder la séance',
      acceptButtonProps: { label: 'Annuler la séance', severity: 'danger' },
      rejectButtonProps: { label: 'Garder la séance', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.cancelSession(current),
    });
  }

  private cancelSession(session: PlannedSessionDetail): void {
    this.detailSaving.set(true);
    this.api
      .cancel(session.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.detailSaving.set(false);
          this.closeDetail();
          this.messages.add({
            severity: 'success',
            summary: 'Séance annulée',
            detail: `${session.name}, ${session.athleteFirstName} ${session.athleteLastName}, ${longDay(session.date)}`,
          });
          this.loadCalendar();
        },
        error: (error: unknown) => {
          this.detailSaving.set(false);
          this.onDetailActionError(error);
        },
      });
  }

  private onDetailActionError(error: unknown): void {
    const code = problemCode(error);
    if (code === 'PLANNED_SESSION_NOT_FOUND') {
      this.onSessionGone(error);
      return;
    }
    if (code === 'PLANNED_SESSION_LOCKED') {
      // Devenue passée entre-temps (minuit) : on relit le détail, sans les actions.
      this.messages.add({ severity: 'warn', summary: problemMessage(error) });
      this.loadDetail();
      this.loadCalendar();
      return;
    }
    const errors = fieldErrors(error);
    if (Object.keys(errors).length > 0) {
      this.detailErrors.set(errors);
    } else {
      this.messages.add({ severity: 'error', summary: problemMessage(error) });
    }
  }

  /** `404 PLANNED_SESSION_NOT_FOUND` : « Cette séance planifiée n'existe plus », rechargement. */
  private onSessionGone(error: unknown): void {
    this.closeDetail();
    this.messages.add({ severity: 'warn', summary: problemMessage(error) });
    this.loadCalendar();
  }

  // --- Dupliquer une semaine (US26) ---

  protected openDuplicate(): void {
    this.duplicateErrors.set({});
    this.duplicateError.set(null);
    this.duplicateVisible.set(true);
  }

  protected submitDuplicate(payload: DuplicateWeekPayload): void {
    const target = this.target();
    if (!target) {
      return;
    }
    this.duplicating.set(true);
    this.duplicateErrors.set({});
    this.duplicateError.set(null);
    const request =
      target.kind === 'athlete'
        ? this.api.duplicateWeekForAthlete(target.id, payload)
        : this.api.duplicateWeekForGroup(target.id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ created }) => {
        this.duplicating.set(false);
        this.duplicateVisible.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Semaine dupliquée',
          detail: `${plural(created, 'séance planifiée créée', 'séances planifiées créées')}`,
        });
        this.loadCalendar();
      },
      error: (error: unknown) => {
        this.duplicating.set(false);
        const code = problemCode(error);
        if (code === 'ATHLETE_NOT_FOUND' || code === 'GROUP_NOT_FOUND') {
          this.duplicateVisible.set(false);
          this.notFound.set(true);
          return;
        }
        const errors = fieldErrors(error);
        if (Object.keys(errors).length > 0) {
          this.duplicateErrors.set(errors);
        } else {
          this.duplicateError.set(problemMessage(error));
        }
      },
    });
  }
}

function entryKey(entry: GroupCalendarEntry): string {
  return `${entry.date}|${entry.snapshotId}`;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}
