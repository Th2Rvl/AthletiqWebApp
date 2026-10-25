import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  PastSessionStatus,
  SessionHistoryItem,
  Uuid,
} from '../../../../core/api/models/api.models';
import { IntensityBadgeComponent } from '../../../../shared/ui/atoms/intensity-badge/intensity-badge.component';
import { PeriodPickerComponent } from '../../../../shared/ui/molecules/period-picker/period-picker.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { sessionStatusLabel, sessionStatusSeverity } from '../../../../shared/ui/session-status';
import { HISTORY_WEEKS, shortDay } from '../../tracking-format';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);
const COLUMN_COUNT = 6;

/** Filtres de l'historique ; `status` `null` = réalisées et non faites. */
export interface HistoryFilters {
  status: PastSessionStatus | null;
  withComment: boolean;
  weeks: number;
}

/**
 * Historique des séances d'un athlète (US27, US29) : séances réalisées et non faites, plus
 * récente d'abord, avec statut, RPE, fatigue et présence d'un commentaire. Chaque ligne mène
 * au prévu / réalisé de la séance. Filtres : statut, « Avec commentaire », période.
 *
 * Tri et pagination (20 par page) sont faits par l'API : `p-table` en mode `lazy`. Chaque
 * changement de filtre est remonté à la page, qui recharge la première page.
 */
@Component({
  selector: 'app-session-history-table',
  imports: [
    FormsModule,
    RouterLink,
    CheckboxModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    IntensityBadgeComponent,
    PeriodPickerComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './session-history-table.component.html',
  styleUrl: './session-history-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionHistoryTableComponent {
  readonly athleteId = input.required<Uuid>();
  readonly sessions = input.required<SessionHistoryItem[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  /** Faux tant que le premier chargement n'a pas abouti : on affiche des squelettes. */
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);
  readonly filters = input.required<HistoryFilters>();

  readonly pageChange = output<PageChange>();
  readonly filtersChange = output<HistoryFilters>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly columnCount = COLUMN_COUNT;
  protected readonly weekChoices = HISTORY_WEEKS;
  protected readonly statusOptions: { value: PastSessionStatus; label: string }[] = [
    { value: 'DONE', label: 'Réalisées' },
    { value: 'MISSED', label: 'Non faites' },
  ];
  protected readonly statusLabel = sessionStatusLabel;
  protected readonly statusSeverity = sessionStatusSeverity;
  protected readonly shortDay = shortDay;

  protected readonly emptyMessage = computed(() => {
    const filters = this.filters();
    return filters.status !== null || filters.withComment
      ? 'Aucune séance ne correspond à ces filtres sur cette période'
      : `Aucune séance passée sur les ${filters.weeks} dernières semaines`;
  });

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }

  protected setStatus(status: PastSessionStatus | null): void {
    this.filtersChange.emit({ ...this.filters(), status });
  }

  protected setWithComment(withComment: boolean): void {
    this.filtersChange.emit({ ...this.filters(), withComment });
  }

  protected setWeeks(weeks: number): void {
    this.filtersChange.emit({ ...this.filters(), weeks });
  }
}
