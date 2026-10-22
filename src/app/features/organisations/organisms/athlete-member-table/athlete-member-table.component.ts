import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { OrganisationAthlete } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';

/**
 * Athlètes d'une organisation (US05) : ceux suivis par au moins un coach membre (RM9),
 * avec leurs coachs référents. Lecture seule. La liste reste vide tant que #8 n'existe pas.
 */
@Component({
  selector: 'app-athlete-member-table',
  imports: [SkeletonModule, TableModule, EmptyStateComponent],
  templateUrl: './athlete-member-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteMemberTableComponent {
  readonly athletes = input.required<OrganisationAthlete[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);

  readonly pageChange = output<PageChange>();

  protected readonly skeletonRows = [0, 1, 2];

  protected coachNames(athlete: OrganisationAthlete): string {
    return athlete.coaches.map((coach) => `${coach.firstName} ${coach.lastName}`).join(', ');
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
