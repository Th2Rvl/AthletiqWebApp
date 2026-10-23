import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Invitation, InvitationStatus } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';

type TagSeverity = 'warn' | 'success' | 'secondary';

/** Libellé et couleur de chaque statut d'invitation, affichés avec `p-tag`. */
export const INVITATION_STATUS: Record<InvitationStatus, { label: string; severity: TagSeverity }> =
  {
    PENDING: { label: 'En attente', severity: 'warn' },
    ACCEPTED: { label: 'Acceptée', severity: 'success' },
    CANCELLED: { label: 'Annulée', severity: 'secondary' },
  };

/**
 * Invitations d'une organisation (US03), les plus récentes d'abord. Une invitation en attente
 * peut être annulée.
 */
@Component({
  selector: 'app-invitation-table',
  imports: [DatePipe, ButtonModule, SkeletonModule, TableModule, TagModule, EmptyStateComponent],
  templateUrl: './invitation-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationTableComponent {
  readonly invitations = input.required<Invitation[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);

  readonly pageChange = output<PageChange>();
  readonly invite = output<void>();
  readonly cancel = output<Invitation>();

  protected readonly skeletonRows = [0, 1, 2];

  protected statusOf(invitation: Invitation): { label: string; severity: TagSeverity } {
    return INVITATION_STATUS[invitation.status];
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
