import { DatePipe } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { GroupMember } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Composition d'un groupe (US14) : athlètes membres, ajout par lot et retrait du groupe.
 * Sans athlète suivi, l'ajout est désactivé et le dit : « Invitez d'abord des athlètes ».
 */
@Component({
  selector: 'app-group-member-table',
  imports: [DatePipe, ButtonModule, SkeletonModule, TableModule, EmptyStateComponent],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './group-member-table.component.html',
  styleUrl: './group-member-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupMemberTableComponent {
  readonly members = input.required<GroupMember[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);
  /** Faux quand le coach n'a encore aucun athlète : il n'y a rien à ajouter. */
  readonly canAdd = input(true);

  readonly pageChange = output<PageChange>();
  readonly add = output<void>();
  readonly remove = output<GroupMember>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly noMemberAtAll = computed(
    () => this.loaded() && !this.loading() && this.totalRecords() === 0,
  );

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
