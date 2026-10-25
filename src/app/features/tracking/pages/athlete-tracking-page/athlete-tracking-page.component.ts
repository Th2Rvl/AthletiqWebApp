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
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { problemCode, problemMessage } from '../../../../core/api/api-problem';
import { Page, SessionHistoryItem, TrackingOverview } from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { TrackingApiService } from '../../../../core/api/tracking-api.service';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { PageChange } from '../../../../shared/ui/page-change';
import {
  HistoryFilters,
  SessionHistoryTableComponent,
} from '../../organisms/session-history-table/session-history-table.component';
import { DEFAULT_HISTORY_WEEKS, lastWeeks } from '../../tracking-format';

const DEFAULT_FILTERS: HistoryFilters = {
  status: null,
  withComment: false,
  weeks: DEFAULT_HISTORY_WEEKS,
};

/**
 * Page « Suivi » d'un athlète (`/athletes/:athleteId/suivi`) : historique de ses séances
 * réalisées et non faites (US27), ressenti et présence d'un commentaire (US29). Chaque séance
 * mène à son prévu / réalisé (`/athletes/:athleteId/seances/:plannedSessionId`).
 *
 * L'en-tête (`GET …/tracking`) donne le nom, `today` (Paris, fourni par l'API) et
 * `hasPastSessions` : sans aucune séance passée, l'état vide propose de planifier. La période
 * de l'historique est calculée à partir de ce `today`, jamais de l'horloge du navigateur.
 *
 * Seule à injecter les services ; lecture seule (Q12).
 */
@Component({
  selector: 'app-athlete-tracking-page',
  imports: [
    RouterLink,
    ButtonModule,
    SkeletonModule,
    EmptyStateComponent,
    ErrorStateComponent,
    PageHeaderComponent,
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

  /** Paramètre de route, lié par `withComponentInputBinding()`. */
  readonly athleteId = input.required<string>();

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
  /** L'athlète a été retiré pendant la consultation : même état que `notFound`. */
  protected readonly athleteGone = computed(
    () => this.notFound() || problemCode(this.history.error()) === 'ATHLETE_NOT_FOUND',
  );

  constructor() {
    effect(() => {
      this.athleteId();
      untracked(() => this.loadOverview());
    });
    inject(DestroyRef).onDestroy(() => this.overviewRequest?.unsubscribe());
  }

  protected loadOverview(): void {
    this.overviewRequest?.unsubscribe();
    this.overview.set(null);
    this.overviewError.set(null);
    this.notFound.set(false);
    this.overviewRequest = this.api.overview(this.athleteId()).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        if (overview.hasPastSessions) {
          this.history.load(0);
        }
      },
      error: (error: unknown) => this.onAthleteError(error),
    });
  }

  protected errorText(error: unknown): string {
    return problemMessage(error);
  }

  protected onFiltersChange(filters: HistoryFilters): void {
    this.filters.set(filters);
    this.history.load(0);
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.history.first() || change.rows !== this.history.rows()) {
      this.history.load(change.first, change.rows);
    }
  }

  protected goTo(path: (string | number)[]): void {
    void this.router.navigate(path);
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

  /** `404 ATHLETE_NOT_FOUND` (athlète retiré, lien clos ou d'un autre coach) : état dédié. */
  private onAthleteError(error: unknown): void {
    if (problemCode(error) === 'ATHLETE_NOT_FOUND') {
      this.notFound.set(true);
    } else {
      this.overviewError.set(error);
    }
  }
}
