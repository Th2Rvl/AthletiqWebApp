import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AthleteSummary, GroupRef, Uuid } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Tableau paginé des athlètes du coach (US11, US12) : recherche, filtre par groupe, lien vers
 * le calendrier de planification (#6) et retrait.
 * Tri (nom puis prénom) et pagination sont faits par l'API (`p-table` en mode `lazy`).
 */
@Component({
  selector: 'app-athlete-table',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    EmptyStateComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './athlete-table.component.html',
  styleUrl: './athlete-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteTableComponent {
  readonly athletes = input.required<AthleteSummary[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  /** Vrai tant que le premier chargement n'a pas abouti : on affiche des squelettes. */
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);
  readonly query = input('');
  readonly groups = input<GroupRef[]>([]);
  readonly groupId = input<Uuid | null>(null);

  readonly pageChange = output<PageChange>();
  readonly queryChange = output<string>();
  readonly groupIdChange = output<Uuid | null>();
  readonly remove = output<AthleteSummary>();
  /** « Inviter un athlète » de l'état vide : la page mène au formulaire de code. */
  readonly invite = output<void>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly filtered = computed(() => this.query().trim() !== '' || this.groupId() !== null);
  /** Aucun athlète du tout (et pas seulement aucun résultat de recherche ou de filtre). */
  protected readonly noAthleteAtAll = computed(
    () => this.loaded() && !this.loading() && this.totalRecords() === 0 && !this.filtered(),
  );

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }

  protected onQueryInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }
}
