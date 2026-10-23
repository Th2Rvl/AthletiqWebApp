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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { WorkoutSummary } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { muscleGroupLabel } from '../../../exercises/exercise-labels';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Liste des séances du coach (Q16) : recherche par nom, tableau paginé côté serveur
 * (`p-table` en `lazy`, tri fixe par date de modification décroissante), et actions
 * Modifier, Dupliquer et Supprimer remontées à la page.
 */
@Component({
  selector: 'app-workout-table',
  imports: [
    DatePipe,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SkeletonModule,
    TableModule,
    TagModule,
    EmptyStateComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workout-table.component.html',
  styleUrl: './workout-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutTableComponent {
  readonly workouts = input.required<WorkoutSummary[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  /** Vrai tant que le premier chargement n'a pas abouti : on affiche des squelettes. */
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);
  readonly query = input('');
  /** Séance en cours de duplication : son bouton affiche un chargement. */
  readonly duplicatingId = input<string | null>(null);

  readonly pageChange = output<PageChange>();
  readonly queryChange = output<string>();
  readonly create = output<void>();
  readonly edit = output<WorkoutSummary>();
  readonly duplicate = output<WorkoutSummary>();
  readonly remove = output<WorkoutSummary>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly muscleGroupLabel = muscleGroupLabel;
  /** Aucune séance du tout, et pas seulement aucun résultat de recherche. */
  protected readonly noWorkoutAtAll = computed(
    () =>
      this.loaded() && !this.loading() && this.totalRecords() === 0 && this.query().trim() === '',
  );

  protected onQueryInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
