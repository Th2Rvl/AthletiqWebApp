import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import { ExerciseApiService } from '../../../../core/api/exercise-api.service';
import {
  Exercise,
  ExerciseRef,
  MuscleGroup,
  Workout,
  WorkoutPayload,
} from '../../../../core/api/models/api.models';
import { WorkoutApiService } from '../../../../core/api/workout-api.service';
import { LeaveGuarded } from '../../../../core/navigation/unsaved-changes.guard';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { ExercisePickerComponent } from '../../organisms/exercise-picker/exercise-picker.component';
import { WorkoutEditorComponent } from '../../organisms/workout-editor/workout-editor.component';
import { WORKOUT_EXERCISES_MAX } from '../../workout-form';

const SEARCH_DEBOUNCE_MS = 300;
/** Le contrat plafonne `size` à 100 : le sélecteur propose les 100 premiers résultats. */
const PICKER_SIZE = 100;
/** Codes qui signifient que la séance demandée n'existe pas (ou pas pour ce coach). */
const NOT_FOUND_CODES = ['WORKOUT_NOT_FOUND', 'INVALID_PARAMETER'];

/**
 * Éditeur de séance sur page dédiée (Q17) : `/seances/nouvelle` et `/seances/:workoutId`.
 * Seule à injecter `WorkoutApiService` et `ExerciseApiService` pour l'éditeur : elle charge la
 * séance, vérifie que la bibliothèque n'est pas vide, alimente le sélecteur d'exercices,
 * enregistre (`POST` puis `PUT` complet, Q9) et retient la sortie si la séance n'est pas
 * enregistrée.
 */
@Component({
  selector: 'app-workout-editor-page',
  imports: [
    RouterLink,
    DialogModule,
    SkeletonModule,
    EmptyStateComponent,
    ErrorStateComponent,
    ExercisePickerComponent,
    WorkoutEditorComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workout-editor-page.component.html',
  styleUrl: './workout-editor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class WorkoutEditorPageComponent implements LeaveGuarded {
  private readonly api = inject(WorkoutApiService);
  private readonly exerciseApi = inject(ExerciseApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route `:workoutId`, absent sur `/seances/nouvelle`. */
  readonly workoutId = input<string>();

  private readonly editor = viewChild(WorkoutEditorComponent);

  protected readonly isNew = computed(() => !this.workoutId());
  protected readonly workout = signal<Workout | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<unknown>(null);
  protected readonly notFound = signal(false);
  /** Faux tant qu'on ignore si la bibliothèque est vide : l'ajout reste alors possible. */
  protected readonly libraryEmpty = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string>>({});
  protected readonly heading = computed(() =>
    this.isNew() ? 'Nouvelle séance' : (this.workout()?.name ?? 'Séance'),
  );

  // Sélecteur d'exercices
  protected readonly pickerVisible = signal(false);
  protected readonly pickerExercises = signal<Exercise[]>([]);
  protected readonly pickerTotal = signal(0);
  protected readonly pickerLoaded = signal(false);
  protected readonly pickerLoading = signal(false);
  protected readonly pickerError = signal<unknown>(null);
  protected readonly pickerQuery = signal('');
  protected readonly pickerMuscleGroup = signal<MuscleGroup | null>(null);
  protected readonly pickerRemaining = signal(WORKOUT_EXERCISES_MAX);
  private readonly pickerQueryInput = new Subject<string>();

  /** Vrai une fois la séance enregistrée ou disparue : la garde de sortie ne demande rien. */
  private leaving = false;
  private workoutRequest?: Subscription;
  private pickerRequest?: Subscription;

  constructor() {
    effect(() => {
      this.workoutId();
      untracked(() => this.load());
    });
    this.pickerQueryInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => {
        this.pickerQuery.set(query);
        this.loadPicker();
      });
    this.destroyRef.onDestroy(() => {
      this.workoutRequest?.unsubscribe();
      this.pickerRequest?.unsubscribe();
    });
  }

  protected load(): void {
    this.notFound.set(false);
    this.loadError.set(null);
    this.checkLibrary();
    const id = this.workoutId();
    if (!id) {
      this.workout.set(null);
      return;
    }
    this.loading.set(true);
    this.workoutRequest?.unsubscribe();
    this.workoutRequest = this.api.get(id).subscribe({
      next: (workout) => {
        this.workout.set(workout);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (NOT_FOUND_CODES.includes(problemCode(error) ?? '')) {
          this.notFound.set(true);
        } else {
          this.loadError.set(error);
        }
      },
    });
  }

  protected loadErrorMessage(): string {
    return problemMessage(this.loadError());
  }

  canLeave(): boolean | Observable<boolean> {
    if (this.leaving || !this.editor()?.isDirty()) {
      return true;
    }
    return new Observable<boolean>((subscriber) => {
      this.confirmation.confirm({
        header: 'Quitter sans enregistrer ?',
        message: 'Les modifications de cette séance seront perdues.',
        acceptLabel: 'Quitter sans enregistrer',
        rejectLabel: "Continuer l'édition",
        acceptButtonProps: { label: 'Quitter sans enregistrer', severity: 'danger' },
        rejectButtonProps: { label: "Continuer l'édition", severity: 'secondary', text: true },
        defaultFocus: 'reject',
        accept: () => {
          subscriber.next(true);
          subscriber.complete();
        },
        reject: () => {
          subscriber.next(false);
          subscriber.complete();
        },
      });
    });
  }

  /** Fermeture ou rechargement de l'onglet : le navigateur demande confirmation. */
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.leaving && this.editor()?.isDirty()) {
      event.preventDefault();
    }
  }

  protected backToList(): void {
    void this.router.navigate(['/seances']);
  }

  protected save(payload: WorkoutPayload): void {
    const id = this.workoutId();
    this.saving.set(true);
    this.serverErrors.set({});
    const request = id ? this.api.update(id, payload) : this.api.create(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (workout) => {
        this.saving.set(false);
        this.messages.add({ severity: 'success', summary: 'Séance enregistrée', detail: workout.name });
        if (id) {
          // La séance relue remplace le formulaire, qui redevient « non modifié ».
          this.workout.set(workout);
        } else {
          this.leaving = true;
          void this.router.navigate(['/seances', workout.id], { replaceUrl: true });
        }
      },
      error: (error: unknown) => this.onSaveError(error),
    });
  }

  private onSaveError(error: unknown): void {
    this.saving.set(false);
    const code = problemCode(error);
    if (code === 'WORKOUT_NOT_FOUND') {
      // Supprimée entre-temps : on le dit et on revient à la liste rechargée.
      this.leaving = true;
      this.messages.add({ severity: 'warn', summary: problemMessage(error) });
      this.backToList();
      return;
    }
    if (code === 'EXERCISE_NOT_FOUND') {
      this.messages.add({
        severity: 'error',
        summary: problemMessage(error),
        detail: "Retirez-le de la séance, puis enregistrez à nouveau.",
      });
      this.checkLibrary();
      return;
    }
    if (code === 'WORKOUT_NAME_ALREADY_EXISTS') {
      this.serverErrors.set({ name: problemMessage(error) });
      return;
    }
    const errors = fieldErrors(error);
    if (Object.keys(errors).length > 0) {
      this.serverErrors.set(errors);
    } else {
      this.messages.add({ severity: 'error', summary: problemMessage(error) });
    }
  }

  // --- Sélecteur d'exercices ---

  protected openPicker(): void {
    this.pickerRemaining.set(WORKOUT_EXERCISES_MAX - this.exerciseCount());
    this.pickerVisible.set(true);
    this.loadPicker();
  }

  protected onPickerQuery(query: string): void {
    this.pickerQueryInput.next(query);
  }

  protected onPickerMuscleGroup(muscleGroup: MuscleGroup | null): void {
    this.pickerMuscleGroup.set(muscleGroup);
    this.loadPicker();
  }

  protected loadPicker(): void {
    this.pickerRequest?.unsubscribe();
    this.pickerLoading.set(true);
    this.pickerError.set(null);
    this.pickerRequest = this.exerciseApi
      .list({
        page: 0,
        size: PICKER_SIZE,
        q: this.pickerQuery(),
        muscleGroup: this.pickerMuscleGroup() ?? undefined,
      })
      .subscribe({
        next: (page) => {
          this.pickerExercises.set(page.content);
          this.pickerTotal.set(page.page.totalElements);
          this.pickerLoaded.set(true);
          this.pickerLoading.set(false);
        },
        error: (error: unknown) => {
          this.pickerError.set(error);
          this.pickerLoading.set(false);
        },
      });
  }

  protected pickerErrorMessage(): string | null {
    return this.pickerError() ? problemMessage(this.pickerError()) : null;
  }

  protected addExercises(refs: ExerciseRef[]): void {
    this.editor()?.addExercises(refs);
    this.pickerVisible.set(false);
  }

  private exerciseCount(): number {
    return this.editor()?.exerciseCount() ?? 0;
  }

  /** État vide de la bibliothèque (US18) : sans exercice, l'ajout est désactivé. */
  private checkLibrary(): void {
    this.exerciseApi
      .list({ page: 0, size: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      // En cas d'échec on laisse l'ajout possible : le sélecteur affichera l'erreur.
      .subscribe({
        next: (page) => this.libraryEmpty.set(page.page.totalElements === 0),
        error: () => this.libraryEmpty.set(false),
      });
  }
}
