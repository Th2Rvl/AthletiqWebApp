import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { OrganisationCoach } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';

/**
 * Coachs membres d'une organisation (US04, US05) : prénom, nom, e-mail, date de rattachement,
 * paginés et triés par nom côté API. Chaque ligne propose le retrait du coach.
 */
@Component({
  selector: 'app-coach-member-table',
  imports: [DatePipe, ButtonModule, SkeletonModule, TableModule, EmptyStateComponent],
  templateUrl: './coach-member-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachMemberTableComponent {
  readonly coaches = input.required<OrganisationCoach[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);

  readonly pageChange = output<PageChange>();
  readonly invite = output<void>();
  readonly remove = output<OrganisationCoach>();

  protected readonly skeletonRows = [0, 1, 2];

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
