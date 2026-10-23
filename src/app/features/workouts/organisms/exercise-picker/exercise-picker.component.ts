import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ListboxModule } from 'primeng/listbox';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { Exercise, ExerciseRef, MuscleGroup, Uuid } from '../../../../core/api/models/api.models';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { MUSCLE_GROUP_OPTIONS, muscleGroupLabel } from '../../../exercises/exercise-labels';

/**
 * Sélecteur d'exercices de la bibliothèque (US18), affiché dans un `p-dialog` par la page.
 * Recherche par nom et filtre par groupe musculaire (faits par l'API, comme la page
 * « Exercices »), sélection multiple dans un `p-listbox`. La sélection est conservée d'une
 * recherche à l'autre et ajoutée à la séance dans l'ordre où le coach l'a faite.
 */
@Component({
  selector: 'app-exercise-picker',
  imports: [
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ListboxModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    ErrorStateComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './exercise-picker.component.html',
  styleUrl: './exercise-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExercisePickerComponent {
  readonly exercises = input.required<Exercise[]>();
  readonly totalRecords = input(0);
  /** Vrai dès qu'un premier chargement a abouti. */
  readonly loaded = input(false);
  readonly loading = input(false);
  /** Message d'erreur du chargement, `null` s'il a réussi. */
  readonly errorMessage = input<string | null>(null);
  readonly query = input('');
  readonly muscleGroup = input<MuscleGroup | null>(null);
  /** Nombre d'exercices que la séance peut encore recevoir (30 au plus). */
  readonly remaining = input(30);

  readonly queryChange = output<string>();
  readonly muscleGroupChange = output<MuscleGroup | null>();
  readonly picked = output<ExerciseRef[]>();
  readonly cancelled = output<void>();
  readonly retry = output<void>();

  protected readonly muscleGroupOptions = MUSCLE_GROUP_OPTIONS;
  protected readonly muscleGroupLabel = muscleGroupLabel;

  /** Identifiants cochés, dans l'ordre de sélection. */
  protected readonly selectedIds = signal<Uuid[]>([]);
  /** Exercices déjà vus, pour garder la sélection quand la recherche change la liste. */
  private readonly seen = new Map<Uuid, ExerciseRef>();

  protected readonly tooMany = computed(() => this.selectedIds().length > this.remaining());
  protected readonly truncated = computed(
    () => this.loaded() && this.totalRecords() > this.exercises().length,
  );
  protected readonly submitLabel = computed(() => {
    const count = this.selectedIds().length;
    return count > 1 ? `Ajouter ${count} exercices` : "Ajouter l'exercice";
  });

  protected onSelection(ids: Uuid[] | null): void {
    for (const exercise of this.exercises()) {
      this.seen.set(exercise.id, {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
      });
    }
    const next = ids ?? [];
    // On garde l'ordre de sélection : les anciens d'abord, puis les nouveaux.
    const kept = this.selectedIds().filter((id) => next.includes(id));
    const added = next.filter((id) => !kept.includes(id));
    this.selectedIds.set([...kept, ...added]);
  }

  protected onQueryInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    const refs = this.selectedIds()
      .map((id) => this.seen.get(id))
      .filter((ref): ref is ExerciseRef => ref !== undefined);
    if (refs.length > 0 && !this.tooMany()) {
      this.picked.emit(refs);
    }
  }
}
