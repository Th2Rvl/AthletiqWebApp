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
import { Exercise, MuscleGroup } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { ExerciseFiltersComponent } from '../../molecules/exercise-filters/exercise-filters.component';
import { muscleGroupLabel } from '../../exercise-labels';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

/**
 * Bibliothèque d'exercices du coach (US16, US17), planche W2 : filtres, tableau paginé sur
 * surface, boutons icône « Modifier » et « Supprimer » par ligne, ligne en cours d'édition
 * surlignée, nombre de résultats sous le tableau. Recherche, filtres et pagination sont faits
 * par l'API (`p-table` en `lazy`). La création se lance depuis l'en-tête de la page.
 */
@Component({
  selector: 'app-exercise-table',
  imports: [
    ButtonModule,
    SkeletonModule,
    TableModule,
    EmptyStateComponent,
    ExerciseFiltersComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  /** Exercice ouvert dans le panneau d'édition : sa ligne est surlignée. */
  readonly editingId = input<string | null>(null);

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

  /** « 8 exercices · Quadriceps » : nombre de résultats et filtre de groupe appliqué. */
  protected readonly countLabel = computed(() => {
    const total = this.totalRecords();
    const parts = [`${total} ${total > 1 ? 'exercices' : 'exercice'}`];
    const group = this.muscleGroup();
    if (group) {
      parts.push(muscleGroupLabel(group).toLowerCase());
    }
    return parts.join(' · ');
  });

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows() });
  }
}
