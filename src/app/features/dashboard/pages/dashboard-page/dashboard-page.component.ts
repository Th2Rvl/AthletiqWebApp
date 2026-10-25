import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { Subscription } from 'rxjs';
import { problemCode, problemMessage } from '../../../../core/api/api-problem';
import { GroupApiService } from '../../../../core/api/group-api.service';
import { KpiApiService } from '../../../../core/api/kpi-api.service';
import { CoachKpis, GroupRef, KpiWeeks, Uuid } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { PeriodPickerComponent } from '../../../../shared/ui/molecules/period-picker/period-picker.component';
import { AthleteKpiTableComponent } from '../../organisms/athlete-kpi-table/athlete-kpi-table.component';
import { KpiSummaryComponent } from '../../organisms/kpi-summary/kpi-summary.component';
import { WatchlistTableComponent } from '../../organisms/watchlist-table/watchlist-table.component';

/** Q13 : 4 semaines glissantes (par défaut) ou 12. */
const KPI_WEEKS: KpiWeeks[] = [4, 12];
/** Le contrat plafonne `size` à 100 : le filtre propose les 100 premiers groupes. */
const GROUP_LIST_SIZE = 100;

/**
 * Page « Tableau de bord » (`/tableau-de-bord`, accueil du coach, US32) : taux de réalisation,
 * séances réalisées et non faites, RPE moyen, athlètes « À surveiller » et indicateurs par
 * athlète, sur 4 ou 12 semaines (aujourd'hui exclu), pour tous les athlètes ou un groupe.
 * Tous les calculs viennent de l'API (RM7, RM8) ; seule à injecter les services.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    FormsModule,
    SelectModule,
    SkeletonModule,
    AthleteKpiTableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    KpiSummaryComponent,
    PageHeaderComponent,
    PeriodPickerComponent,
    WatchlistTableComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly api = inject(KpiApiService);
  private readonly groupApi = inject(GroupApiService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly weekChoices = KPI_WEEKS;
  protected readonly weeks = signal<KpiWeeks>(4);
  protected readonly groupId = signal<Uuid | null>(null);
  protected readonly groups = signal<GroupRef[]>([]);

  protected readonly kpis = signal<CoachKpis | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<unknown>(null);
  private request?: Subscription;

  /** Aucun athlète suivi du tout (et pas seulement dans le groupe choisi). */
  protected readonly noAthlete = computed(() => {
    const kpis = this.kpis();
    return kpis !== null && kpis.groupId === null && kpis.totals.athleteCount === 0;
  });
  protected readonly emptyGroup = computed(() => {
    const kpis = this.kpis();
    return kpis !== null && kpis.groupId !== null && kpis.totals.athleteCount === 0;
  });

  constructor() {
    this.load();
    this.loadGroups();
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.request = this.api.kpis({ weeks: this.weeks(), groupId: this.groupId() }).subscribe({
      next: (kpis) => {
        this.loading.set(false);
        this.kpis.set(kpis);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (problemCode(error) === 'GROUP_NOT_FOUND') {
          // Groupe supprimé entre-temps : retour à tous les athlètes, liste des groupes relue.
          this.messages.add({ severity: 'warn', summary: problemMessage(error) });
          this.groupId.set(null);
          this.loadGroups();
          this.load();
          return;
        }
        this.error.set(error);
      },
    });
  }

  protected onWeeksChange(weeks: number): void {
    this.weeks.set(weeks as KpiWeeks);
    this.load();
  }

  protected onGroupChange(groupId: Uuid | null): void {
    this.groupId.set(groupId);
    this.load();
  }

  protected errorText(error: unknown): string {
    return problemMessage(error);
  }

  protected goToAthletes(): void {
    void this.router.navigate(['/athletes']);
  }

  /** Groupes proposés dans le filtre ; un échec laisse simplement le filtre vide. */
  private loadGroups(): void {
    this.groupApi
      .list({ page: 0, size: GROUP_LIST_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) =>
          this.groups.set(page.content.map((group) => ({ id: group.id, name: group.name }))),
        error: () => this.groups.set([]),
      });
  }
}
