import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Exercise, MuscleGroup } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { ExerciseFiltersComponent } from '../../molecules/exercise-filters/exercise-filters.component';
import { muscleGroupLabel } from '../../exercise-labels';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Bibliothèque d'exercices du coach (US16, US17) : filtres, tableau paginé, modification et
 * suppression. Recherche, filtres, tri et pagination sont faits par l'API (`p-table` en `lazy`).
 */
@Component({
  selector: 'app-exercise-table',
  imports: [
    ButtonModule,
    SkeletonModule,
    TableModule,
    TagModule,
    EmptyStateComponent,
    ExerciseFiltersComponent,
  ],
  templateUrl: './exercise-table.component.html',
  styleUrl: './exercise-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseTableComponent {
  readonly exercises = input.required<Exercise[]>();
  readonly totalRecords = input.required<number>();
  readonly loading = input(false);
  /** Vrai tant que le premier chargement n'a pas abouti : on affiche des squelettes. */
  readonly loaded = input(true);
  readonly first = input(0);
  readonly rows = input(20);
  readonly query = input('');
  readonly muscleGroup = input<MuscleGroup | null>(null);
  readonly equipment = input('');

  readonly pageChange = output<PageChange>();
  readonly queryChange = output<string>();
  readonly muscleGroupChange = output<MuscleGroup | null>();
  readonly equipmentChange = output<string>();
  readonly create = output<void>();
  readonly edit = output<Exercise>();
  readonly remove = output<Exercise>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly muscleGroupLabel = muscleGroupLabel;
  protected readonly filtered = computed(
    () =>
      this.query().trim() !== '' || this.muscleGroup() !== null || this.equipment().trim() !== '',
  );
  /** Aucun exercice du tout, et pas seulement aucun résultat de recherche ou de filtre. */
  protected readonly noExerciseAtAll = computed(
    () => this.loaded() && !this.loading() && this.totalRecords() === 0 && !this.filtered(),
  );

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
