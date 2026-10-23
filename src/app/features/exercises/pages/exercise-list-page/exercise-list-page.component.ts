import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  fieldErrors,
  httpStatus,
  problemCode,
  problemMessage,
} from '../../../../core/api/api-problem';
import { ExerciseApiService } from '../../../../core/api/exercise-api.service';
import { Exercise, ExercisePayload, MuscleGroup } from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { ExerciseFormComponent } from '../../organisms/exercise-form/exercise-form.component';
import { ExerciseTableComponent } from '../../organisms/exercise-table/exercise-table.component';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Page « Exercices » (US15 à US17) : bibliothèque du coach, avec recherche par nom, filtres
 * par groupe musculaire et matériel, création, modification et suppression confirmée.
 */
@Component({
  selector: 'app-exercise-list-page',
  imports: [DialogModule, ErrorStateComponent, ExerciseFormComponent, ExerciseTableComponent],
  templateUrl: './exercise-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseListPageComponent {
  private readonly api = inject(ExerciseApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  protected readonly muscleGroup = signal<MuscleGroup | null>(null);
  protected readonly equipment = signal('');
  private readonly queryInput = new Subject<string>();
  private readonly equipmentInput = new Subject<string>();

  protected readonly exercises = new PagedList<Exercise>((page) =>
    this.api.list({
      ...page,
      q: this.query(),
      muscleGroup: this.muscleGroup() ?? undefined,
      equipment: this.equipment(),
    }),
  );

  /** Dialog de création (exercice `null`) ou de modification. */
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Exercise | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string>>({});

  constructor() {
    this.queryInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => {
        this.query.set(query);
        this.exercises.load(0);
      });
    this.equipmentInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((equipment) => {
        this.equipment.set(equipment);
        this.exercises.load(0);
      });
    this.exercises.load(0);
  }

  protected errorMessage(): string {
    return problemMessage(this.exercises.error());
  }

  protected onQueryChange(query: string): void {
    this.queryInput.next(query);
  }

  protected onEquipmentChange(equipment: string): void {
    this.equipmentInput.next(equipment);
  }

  protected onMuscleGroupChange(muscleGroup: MuscleGroup | null): void {
    this.muscleGroup.set(muscleGroup);
    this.exercises.load(0);
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.exercises.first() || change.rows !== this.exercises.rows()) {
      this.exercises.load(change.first, change.rows);
    }
  }

  protected openCreate(): void {
    this.openDialog(null);
  }

  protected openEdit(exercise: Exercise): void {
    this.openDialog(exercise);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected save(payload: ExercisePayload): void {
    const editing = this.editing();
    this.saving.set(true);
    this.serverErrors.set({});
    const request = editing ? this.api.update(editing.id, payload) : this.api.create(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (exercise) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.exercises.reload();
        this.messages.add({
          severity: 'success',
          summary: editing ? 'Exercice modifié' : 'Exercice créé',
          detail: exercise.name,
        });
      },
      error: (error: unknown) => this.onSaveError(error, editing !== null),
    });
  }

  private onSaveError(error: unknown, editing: boolean): void {
    this.saving.set(false);
    const status = httpStatus(error);
    if (status === 404 && editing) {
      this.dialogVisible.set(false);
      this.notifyGone();
      return;
    }
    // 409 de nom en double : sous le champ nom, distinct du 409 EXERCISE_IN_USE (suppression).
    if (problemCode(error) === 'EXERCISE_NAME_ALREADY_EXISTS') {
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

  protected confirmRemove(exercise: Exercise): void {
    this.confirmation.confirm({
      header: `Supprimer « ${exercise.name} » ?`,
      message: 'Cet exercice disparaît de votre bibliothèque. Cette action est définitive.',
      acceptLabel: "Supprimer l'exercice",
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: "Supprimer l'exercice", severity: 'danger' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.remove(exercise),
    });
  }

  private remove(exercise: Exercise): void {
    this.api
      .delete(exercise.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: 'Exercice supprimé',
            detail: exercise.name,
          });
          this.exercises.reload();
        },
        error: (error: unknown) => {
          if (httpStatus(error) === 404) {
            this.notifyGone();
          } else if (problemCode(error) === 'EXERCISE_IN_USE') {
            // Q15 : l'exercice reste dans la bibliothèque tant qu'une séance l'utilise.
            this.messages.add({
              severity: 'warn',
              summary: problemMessage(error),
              detail: "Retirez-le de ces séances pour pouvoir le supprimer. Rien n'a été supprimé.",
            });
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  private openDialog(exercise: Exercise | null): void {
    this.editing.set(exercise);
    this.serverErrors.set({});
    this.dialogVisible.set(true);
  }

  /** 404 : l'exercice a été supprimé entre-temps. On recharge la liste. */
  private notifyGone(): void {
    this.messages.add({ severity: 'warn', summary: "Cet exercice n'existe plus" });
    this.exercises.reload();
  }
}
