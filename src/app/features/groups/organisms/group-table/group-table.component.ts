import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Group } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Tableau paginé des groupes du coach (US13) : accès à la composition, renommage et
 * suppression. Tri par nom et pagination sont faits par l'API (`p-table` en mode `lazy`).
 */
@Component({
  selector: 'app-group-table',
  imports: [DatePipe, RouterLink, ButtonModule, SkeletonModule, TableModule, EmptyStateComponent],
  templateUrl: './group-table.component.html',
  styleUrl: './group-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupTableComponent {
  readonly groups = input.required<Group[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);

  readonly pageChange = output<PageChange>();
  readonly create = output<void>();
  readonly rename = output<Group>();
  readonly remove = output<Group>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly noGroupAtAll = computed(
    () => this.loaded() && !this.loading() && this.totalRecords() === 0,
  );

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
