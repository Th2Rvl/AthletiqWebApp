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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { problemCode, problemMessage } from '../../../../core/api/api-problem';
import {
  Page,
  PerformedExercise,
  PersonalRecords,
  Progression,
  ProgressionWeeks,
  SessionHistoryItem,
  TrackingOverview,
  Uuid,
} from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { TrackingApiService } from '../../../../core/api/tracking-api.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { PeriodPickerComponent } from '../../../../shared/ui/molecules/period-picker/period-picker.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { muscleGroupLabel } from '../../../exercises/exercise-labels';
import { PersonalRecordsTableComponent } from '../../organisms/personal-records-table/personal-records-table.component';
import { ProgressionChartComponent } from '../../organisms/progression-chart/progression-chart.component';
import {
  HistoryFilters,
  SessionHistoryTableComponent,
} from '../../organisms/session-history-table/session-history-table.component';
import { DEFAULT_HISTORY_WEEKS, lastWeeks } from '../../tracking-format';

/** Onglets de l'écran, dans l'URL : `?onglet=historique|progression|records` (Q15). */
export type TrackingTab = 'historique' | 'progression' | 'records';
const TABS: TrackingTab[] = ['historique', 'progression', 'records'];

const DEFAULT_FILTERS: HistoryFilters = {
  status: null,
  withComment: false,
  weeks: DEFAULT_HISTORY_WEEKS,
};
/** Q8, contrat §5 : 4, 12, 26 ou 52 semaines, 12 par défaut. */
const PROGRESSION_WEEKS: ProgressionWeeks[] = [4, 12, 26, 52];
const DEFAULT_PROGRESSION_WEEKS: ProgressionWeeks = 12;

/**
 * Page « Suivi » d'un athlète (`/athletes/:athleteId/suivi`), en lecture seule (Q12), en trois
 * onglets :
 * - Historique : séances réalisées et non faites (US27), ressenti et commentaire (US29) ;
 *   chaque séance mène à son prévu / réalisé (`/athletes/:athleteId/seances/:id`).
 * - Progression : courbe et tableau d'un exercice réalisé, sur 4 à 52 semaines (US30).
 * - Records : meilleure charge par exercice (US31).
 *
 * L'en-tête (`GET …/tracking`) donne le nom, `today` (Paris, fourni par l'API) et
 * `hasPastSessions` : sans aucune séance passée, l'état vide propose de planifier et les
 * onglets ne s'affichent pas. La période de l'historique part de ce `today`, jamais de
 * l'horloge du navigateur. Chaque onglet charge ses données à sa première ouverture.
 *
 * Seule à injecter les services.
 */
@Component({
  selector: 'app-athlete-tracking-page',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    SelectModule,
    SkeletonModule,
    TabsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    PageHeaderComponent,
    PeriodPickerComponent,
    PersonalRecordsTableComponent,
    ProgressionChartComponent,
    SessionHistoryTableComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './athlete-tracking-page.component.html',
  styleUrl: './athlete-tracking-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteTrackingPageComponent {
  private readonly api = inject(TrackingApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Paramètres de route et de requête, liés par `withComponentInputBinding()`. */
  readonly athleteId = input.required<string>();
  readonly onglet = input<string | undefined>();

  /** Thème sombre : le graphique relit ses couleurs quand il change. */
  protected readonly dark = inject(ThemeService).isDark;

  protected readonly tab = computed<TrackingTab>(() => {
    const onglet = this.onglet();
    return TABS.includes(onglet as TrackingTab) ? (onglet as TrackingTab) : 'historique';
  });

  protected readonly overview = signal<TrackingOverview | null>(null);
  protected readonly overviewError = signal<unknown>(null);
  protected readonly notFound = signal(false);
  private overviewRequest?: Subscription;

  protected readonly fullName = computed(() => {
    const overview = this.overview();
    return overview ? `${overview.firstName} ${overview.lastName}` : null;
  });

  // --- Historique (US27, US29) ---

  protected readonly filters = signal<HistoryFilters>(DEFAULT_FILTERS);
  protected readonly history = new PagedList<SessionHistoryItem>((page) =>
    this.fetchHistory(page.page, page.size),
  );

  // --- Progression (US30) ---

  protected readonly progressionWeekChoices = PROGRESSION_WEEKS;
  protected readonly exercises = signal<PerformedExercise[] | null>(null);
  protected readonly exercisesError = signal<unknown>(null);
  protected readonly exerciseOptions = computed(() =>
    (this.exercises() ?? []).map((exercise) => ({
      value: exercise.exerciseId,
      label: `${exercise.exerciseName} (${muscleGroupLabel(exercise.muscleGroup)})`,
    })),
  );
  protected readonly exerciseId = signal<Uuid | null>(null);
  protected readonly progressionWeeks = signal<ProgressionWeeks>(DEFAULT_PROGRESSION_WEEKS);
  protected readonly progression = signal<Progression | null>(null);
  protected readonly progressionLoading = signal(false);
  protected readonly progressionError = signal<unknown>(null);
  private exercisesRequest?: Subscription;
  private progressionRequest?: Subscription;

  // --- Records (US31) ---

  protected readonly records = signal<PersonalRecords | null>(null);
  protected readonly recordsError = signal<unknown>(null);
  private recordsRequest?: Subscription;

  private readonly requestedTabs = new Set<TrackingTab>();

  /** L'athlète a été retiré pendant la consultation : même état que `notFound`. */
  protected readonly athleteGone = computed(
    () =>
      this.notFound() ||
      [
        this.history.error(),
        this.exercisesError(),
        this.progressionError(),
        this.recordsError(),
      ].some((error) => problemCode(error) === 'ATHLETE_NOT_FOUND'),
  );

  constructor() {
    effect(() => {
      this.athleteId();
      untracked(() => this.loadOverview());
    });
    // Chaque onglet charge ses données à sa première ouverture, une fois l'en-tête lu.
    effect(() => {
      const overview = this.overview();
      const tab = this.tab();
      if (overview?.hasPastSessions) {
        untracked(() => this.loadTab(tab));
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.overviewRequest?.unsubscribe();
      this.exercisesRequest?.unsubscribe();
      this.progressionRequest?.unsubscribe();
      this.recordsRequest?.unsubscribe();
    });
  }

  protected loadOverview(): void {
    this.overviewRequest?.unsubscribe();
    this.overview.set(null);
    this.overviewError.set(null);
    this.notFound.set(false);
    this.requestedTabs.clear();
    this.exercises.set(null);
    this.exercisesError.set(null);
    this.exerciseId.set(null);
    this.progression.set(null);
    this.progressionError.set(null);
    this.records.set(null);
    this.recordsError.set(null);
    this.overviewRequest = this.api.overview(this.athleteId()).subscribe({
      next: (overview) => this.overview.set(overview),
      error: (error: unknown) => this.onAthleteError(error),
    });
  }

  protected errorText(error: unknown): string {
    return problemMessage(error);
  }

  protected selectTab(tab: string | number | undefined): void {
    if (typeof tab === 'string' && tab !== this.tab()) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { onglet: tab } });
    }
  }

  protected goTo(path: (string | number)[]): void {
    void this.router.navigate(path);
  }

  /** Premier affichage d'un onglet : sa requête part une seule fois par athlète. */
  private loadTab(tab: TrackingTab): void {
    if (this.requestedTabs.has(tab)) {
      return;
    }
    this.requestedTabs.add(tab);
    if (tab === 'historique') {
      this.history.load(0);
    } else if (tab === 'progression') {
      this.loadExercises();
    } else {
      this.loadRecords();
    }
  }

  // --- Historique ---

  protected onFiltersChange(filters: HistoryFilters): void {
    this.filters.set(filters);
    this.history.load(0);
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.history.first() || change.rows !== this.history.rows()) {
      this.history.load(change.first, change.rows);
    }
  }

  private fetchHistory(page: number, size: number): Observable<Page<SessionHistoryItem>> {
    const overview = this.overview();
    if (!overview) {
      return EMPTY;
    }
    const { status, withComment, weeks } = this.filters();
    return this.api.history(overview.athleteId, {
      page,
      size,
      ...lastWeeks(overview.today, weeks),
      status: status ?? undefined,
      withComment,
    });
  }

  // --- Progression ---

  protected loadExercises(): void {
    this.exercisesRequest?.unsubscribe();
    this.exercisesError.set(null);
    this.exercisesRequest = this.api.performedExercises(this.athleteId()).subscribe({
      next: (exercises) => {
        this.exercises.set(exercises);
        const current = this.exerciseId();
        if (!exercises.some((exercise) => exercise.exerciseId === current)) {
          // Par défaut, l'exercice réalisé le plus récemment.
          const latest = [...exercises].sort((a, b) =>
            b.lastPerformedOn.localeCompare(a.lastPerformedOn),
          )[0];
          this.exerciseId.set(latest?.exerciseId ?? null);
        }
        this.loadProgression();
      },
      error: (error: unknown) => this.exercisesError.set(error),
    });
  }

  protected onExerciseChange(exerciseId: Uuid | null): void {
    if (exerciseId && exerciseId !== this.exerciseId()) {
      this.exerciseId.set(exerciseId);
      this.loadProgression();
    }
  }

  protected onProgressionWeeksChange(weeks: number): void {
    this.progressionWeeks.set(weeks as ProgressionWeeks);
    this.loadProgression();
  }

  protected loadProgression(): void {
    this.progressionRequest?.unsubscribe();
    const exerciseId = this.exerciseId();
    this.progressionError.set(null);
    if (!exerciseId) {
      this.progression.set(null);
      this.progressionLoading.set(false);
      return;
    }
    this.progressionLoading.set(true);
    this.progressionRequest = this.api
      .progression(this.athleteId(), exerciseId, this.progressionWeeks())
      .subscribe({
        next: (progression) => {
          this.progressionLoading.set(false);
          this.progression.set(progression);
        },
        error: (error: unknown) => {
          this.progressionLoading.set(false);
          this.progression.set(null);
          if (problemCode(error) === 'EXERCISE_NOT_FOUND') {
            // L'exercice a disparu de la liste (séance annulée, exercice supprimé) : on la relit.
            this.exerciseId.set(null);
            this.loadExercises();
            return;
          }
          this.progressionError.set(error);
        },
      });
  }

  // --- Records ---

  protected loadRecords(): void {
    this.recordsRequest?.unsubscribe();
    this.recordsError.set(null);
    this.recordsRequest = this.api.personalRecords(this.athleteId()).subscribe({
      next: (records) => this.records.set(records),
      error: (error: unknown) => this.recordsError.set(error),
    });
  }

  /** `404 ATHLETE_NOT_FOUND` (athlète retiré, lien clos ou d'un autre coach) : état dédié. */
  private onAthleteError(error: unknown): void {
    if (problemCode(error) === 'ATHLETE_NOT_FOUND') {
      this.notFound.set(true);
    } else {
      this.overviewError.set(error);
    }
  }
}
