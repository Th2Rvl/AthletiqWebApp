import { DatePipe } from '@angular/common';
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
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Organisation, OrganisationSortField } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';

export interface OrganisationTableState {
  first: number;
  rows: number;
  sortField: OrganisationSortField;
  sortOrder: 1 | -1;
}

const SORTABLE: readonly OrganisationSortField[] = ['name', 'createdAt'];
const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Tableau paginé des organisations (US01, US02) : recherche, tri par nom ou date de création,
 * accès à la fiche, modification et suppression. Pagination et tri sont faits par l'API
 * (`p-table` en mode `lazy`) : l'organisme ne fait que remonter l'état demandé.
 */
@Component({
  selector: 'app-organisation-table',
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SkeletonModule,
    TableModule,
    EmptyStateComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './organisation-table.component.html',
  styleUrl: './organisation-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationTableComponent {
  readonly organisations = input.required<Organisation[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  /** Vrai tant que le premier chargement n'a pas abouti : on affiche des squelettes. */
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);
  readonly query = input('');

  readonly stateChange = output<OrganisationTableState>();
  readonly queryChange = output<string>();
  readonly create = output<void>();
  readonly edit = output<Organisation>();
  readonly remove = output<Organisation>();

  protected readonly skeletonRows = SKELETON_ROWS;
  /** Aucune organisation du tout (et pas seulement aucun résultat de recherche). */
  protected readonly noOrganisationAtAll = computed(
    () => this.loaded() && !this.loading() && this.totalRecords() === 0 && !this.query().trim(),
  );

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const field = SORTABLE.find((candidate) => candidate === event.sortField) ?? 'name';
    this.stateChange.emit({
      first: event.first ?? 0,
      rows: event.rows ?? this.rows(),
      sortField: field,
      sortOrder: event.sortOrder === -1 ? -1 : 1,
    });
  }

  protected onQueryInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }
}
