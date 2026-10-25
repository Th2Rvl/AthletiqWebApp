import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValueChangeEvent,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { filter } from 'rxjs';
import { ExerciseRef, Workout, WorkoutPayload } from '../../../../core/api/models/api.models';
import { trimmedLength } from '../../../../shared/forms/validators';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { BulkSetsInputComponent } from '../../molecules/bulk-sets-input/bulk-sets-input.component';
import {
  PlannedSetRowComponent,
  SetRowErrors,
} from '../../molecules/planned-set-row/planned-set-row.component';
import {
  BulkSets,
  SetValues,
  WORKOUT_DESCRIPTION_MAX,
  WORKOUT_EXERCISES_MAX,
  WORKOUT_NAME_MAX,
  WORKOUT_NOTE_MAX,
  WORKOUT_SETS_MAX,
  WorkoutExerciseForm,
  arrayLength,
  createExerciseForm,
  createSetForm,
  setFieldError,
} from '../../workout-form';

const EMPTY_SET: SetValues = { reps: null, loadKg: null, restSeconds: null };

/**
 * Éditeur de séance (US18 à US20), planche W3 : en-tête avec fil « Séances / Modifier », nom
 * éditable en place à la taille du titre, synthèse (exercices, séries) et actions en haut à
 * droite ; consignes ; blocs d'exercice sur surface avec poignée, numéro, séries prévues en
 * champs tonals et consigne pour l'athlète. La saisie reste série par série (décision #70).
 *
 * Organisme présentationnel : la page lui donne la séance, l'état de la bibliothèque et les
 * erreurs de l'API ; il émet une séance normalisée (`WorkoutPayload`, positions implicites).
 * L'ajout d'exercices passe par la page, qui ouvre le sélecteur puis appelle `addExercises`.
 * Le réordonnancement se fait au glisser-déposer (CDK) ou au clavier (« Monter », « Descendre »).
 * Les erreurs `400` arrivent avec les chemins du contrat (`exercises[2].sets[1].reps`…) et
 * s'affichent sous le champ concerné ; celle d'un champ disparaît dès qu'on le modifie.
 */
@Component({
  selector: 'app-workout-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    ButtonModule,
    InputTextModule,
    MessageModule,
    TextareaModule,
    FormFieldComponent,
    PageHeaderComponent,
    PlannedSetRowComponent,
    BulkSetsInputComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workout-editor.component.html',
  styleUrl: './workout-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutEditorComponent {
  private readonly injector = inject(Injector);
  private readonly changeDetector = inject(ChangeDetectorRef);

  /** Séance à modifier, ou `null` pour une création. */
  readonly workout = input<Workout | null>(null);
  /** Vrai quand le coach n'a encore aucun exercice : l'ajout est désactivé. */
  readonly libraryEmpty = input(false);
  readonly saving = input(false);
  /** Erreurs renvoyées par l'API, par chemin JSON (`name`, `exercises[0].sets[1].reps`…). */
  readonly serverErrors = input<Record<string, string>>({});
  /** Titre lu par les lecteurs d'écran : « Nouvelle séance » ou le nom enregistré. */
  readonly heading = input('Séance');
  /** Vrai sur `/seances/nouvelle` : ni « Dupliquer » ni « Supprimer ». */
  readonly isNew = input(true);
  readonly duplicating = input(false);

  readonly submitted = output<WorkoutPayload>();
  readonly cancelled = output<void>();
  readonly addRequested = output<void>();
  readonly duplicate = output<void>();
  readonly remove = output<void>();

  protected readonly nameMax = WORKOUT_NAME_MAX;
  protected readonly descriptionMax = WORKOUT_DESCRIPTION_MAX;
  protected readonly exercisesMax = WORKOUT_EXERCISES_MAX;
  protected readonly setsMax = WORKOUT_SETS_MAX;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [trimmedLength(1, WORKOUT_NAME_MAX)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [trimmedLength(0, WORKOUT_DESCRIPTION_MAX)],
    }),
    exercises: new FormArray<WorkoutExerciseForm>([], [arrayLength(1, WORKOUT_EXERCISES_MAX)]),
  });

  protected readonly submitAttempted = signal(false);
  /** Message lu par les lecteurs d'écran après un déplacement, un ajout ou un retrait. */
  protected readonly announcement = signal('');
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());
  private nextKey = 0;

  constructor() {
    effect(() => {
      const workout = this.workout();
      untracked(() => this.reset(workout));
    });
    // Tout événement du formulaire (valeur, statut, touché), même déclenché par la page
    // (`addExercises`), relance l'affichage des erreurs et de la liste.
    this.form.events
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.changeDetector.markForCheck());
    this.form.events
      .pipe(
        filter((event) => event instanceof ValueChangeEvent),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.forgetServerErrors(event.source));
  }

  protected get exercises(): FormArray<WorkoutExerciseForm> {
    return this.form.controls.exercises;
  }

  /** Vrai si le coach a modifié la séance depuis son chargement ou son dernier enregistrement. */
  isDirty(): boolean {
    return this.form.dirty;
  }

  /** Synthèse sous le titre : « 4 exercices · 14 séries ». */
  protected summary(): string {
    const exercises = this.exercises.length;
    const sets = this.exercises.controls.reduce(
      (total, exercise) => total + exercise.controls.sets.length,
      0,
    );
    return `${exercises} ${exercises > 1 ? 'exercices' : 'exercice'} · ${sets} ${sets > 1 ? 'séries' : 'série'}`;
  }

  /** Nombre d'exercices de la séance en cours d'édition (30 au plus). */
  exerciseCount(): number {
    return this.exercises.length;
  }

  /** Ajoute des exercices de la bibliothèque en fin de séance, sans série (dans la limite de 30). */
  addExercises(refs: ExerciseRef[]): void {
    const room = WORKOUT_EXERCISES_MAX - this.exercises.length;
    const added = refs.slice(0, Math.max(0, room));
    if (added.length === 0) {
      return;
    }
    this.form.markAsDirty();
    for (const ref of added) {
      this.exercises.push(createExerciseForm(this.nextKey++, ref, null, []), { emitEvent: false });
    }
    this.exercises.updateValueAndValidity();
    this.announce(
      added.length > 1
        ? `${added.length} exercices ajoutés à la séance`
        : `${added[0].name} ajouté à la séance`,
    );
    const key = this.exercises.at(this.exercises.length - added.length).controls.key.value;
    this.focusLater(`workout-exercise-${key}-name`);
  }

  protected removeExercise(index: number): void {
    const name = this.exercises.at(index).controls.exercise.value.name;
    this.form.markAsDirty();
    this.exercises.removeAt(index);
    this.announce(`${name} retiré de la séance`);
  }

  /** Déplacement au clavier : `delta` vaut -1 (« Monter ») ou 1 (« Descendre »). */
  protected move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= this.exercises.length) {
      return;
    }
    const group = this.exercises.at(index);
    this.moveExercise(index, target);
    const key = group.controls.key.value;
    const preferred = delta < 0 ? 'up' : 'down';
    const fallback = delta < 0 ? 'down' : 'up';
    afterNextRender(
      () => {
        const button = document.getElementById(`workout-exercise-${key}-${preferred}`);
        const other = document.getElementById(`workout-exercise-${key}-${fallback}`);
        const usable = (element: HTMLElement | null) =>
          element && !(element as HTMLButtonElement).disabled ? element : null;
        (usable(button) ?? usable(other))?.focus();
      },
      { injector: this.injector },
    );
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    this.moveExercise(event.previousIndex, event.currentIndex);
  }

  protected addSet(index: number): void {
    const sets = this.exercises.at(index).controls.sets;
    if (sets.length >= WORKOUT_SETS_MAX) {
      return;
    }
    // Q4 : la nouvelle série reprend les valeurs de la précédente, repos compris.
    const previous = sets.length > 0 ? sets.at(sets.length - 1).getRawValue() : EMPTY_SET;
    this.form.markAsDirty();
    sets.push(createSetForm(previous));
  }

  protected removeSet(index: number, setIndex: number): void {
    this.form.markAsDirty();
    this.exercises.at(index).controls.sets.removeAt(setIndex);
  }

  /** « N séries identiques » (Q1) : remplace les séries de l'exercice. */
  protected applyBulk(index: number, bulk: BulkSets): void {
    const group = this.exercises.at(index);
    const sets = group.controls.sets;
    const count = Math.min(bulk.count, WORKOUT_SETS_MAX);
    this.form.markAsDirty();
    sets.clear({ emitEvent: false });
    for (let i = 0; i < count; i++) {
      sets.push(createSetForm(bulk), { emitEvent: false });
    }
    sets.updateValueAndValidity();
    this.announce(
      `${count} ${count > 1 ? 'séries créées' : 'série créée'} pour ${group.controls.exercise.value.name}`,
    );
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      this.announce("La séance n'est pas enregistrée : corrigez les champs signalés.");
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      name: raw.name.trim(),
      description: orNull(raw.description),
      exercises: raw.exercises.map((exercise) => ({
        exerciseId: exercise.exercise.id,
        note: orNull(exercise.note),
        sets: exercise.sets.map((set) => ({
          reps: set.reps!,
          loadKg: set.loadKg,
          restSeconds: set.restSeconds,
        })),
      })),
    });
  }

  // --- Messages d'erreur, validation locale d'abord, puis erreur de l'API ---

  protected nameError(): string | null {
    const control = this.form.controls.name;
    if (control.hasError('trimmedLength')) {
      return `Le nom ne doit pas dépasser ${WORKOUT_NAME_MAX} caractères`;
    }
    if (control.hasError('required') && (control.dirty || this.submitAttempted())) {
      return 'Le nom de la séance est obligatoire';
    }
    return this.serverError('name');
  }

  protected descriptionError(): string | null {
    if (this.form.controls.description.hasError('trimmedLength')) {
      return `Les consignes ne doivent pas dépasser ${WORKOUT_DESCRIPTION_MAX} caractères`;
    }
    return this.serverError('description');
  }

  protected exercisesError(): string | null {
    if (this.exercises.hasError('arrayMin') && this.submitAttempted()) {
      return 'Ajoutez au moins un exercice';
    }
    return this.serverError('exercises');
  }

  protected exerciseError(index: number): string | null {
    return this.serverError(`exercises[${index}]`) ?? this.serverError(`exercises[${index}].exerciseId`);
  }

  protected noteError(index: number): string | null {
    if (this.exercises.at(index).controls.note.hasError('trimmedLength')) {
      return `La note ne doit pas dépasser ${WORKOUT_NOTE_MAX} caractères`;
    }
    return this.serverError(`exercises[${index}].note`);
  }

  protected setsError(index: number): string | null {
    const sets = this.exercises.at(index).controls.sets;
    if (sets.hasError('arrayMin') && this.submitAttempted()) {
      return 'Ajoutez au moins une série';
    }
    return this.serverError(`exercises[${index}].sets`);
  }

  protected setErrors(index: number, setIndex: number): SetRowErrors {
    const set = this.exercises.at(index).controls.sets.at(setIndex);
    const path = `exercises[${index}].sets[${setIndex}]`;
    const errorOf = (field: keyof SetValues): string | null => {
      const control = set.controls[field];
      const local =
        control.touched || this.submitAttempted() ? setFieldError(field, control.errors) : null;
      return local ?? this.serverError(`${path}.${field}`) ?? null;
    };
    return {
      reps: errorOf('reps') ?? this.serverError(path),
      loadKg: errorOf('loadKg'),
      restSeconds: errorOf('restSeconds'),
    };
  }

  protected hasErrors(): boolean {
    return this.submitAttempted() && this.form.invalid;
  }

  private serverError(path: string): string | null {
    return this.visibleServerErrors()[path] ?? null;
  }

  // --- Mécanique interne ---

  private reset(workout: Workout | null): void {
    this.exercises.clear({ emitEvent: false });
    for (const exercise of workout?.exercises ?? []) {
      this.exercises.push(
        createExerciseForm(this.nextKey++, exercise.exercise, exercise.note, exercise.sets),
        { emitEvent: false },
      );
    }
    // Pas de `form.reset(valeur)` : il remettrait aussi à vide les séries qu'on vient de créer.
    this.form.controls.name.reset(workout?.name ?? '');
    this.form.controls.description.reset(workout?.description ?? '');
    this.exercises.updateValueAndValidity();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitAttempted.set(false);
  }

  private moveExercise(from: number, to: number): void {
    if (from === to) {
      return;
    }
    const group = this.exercises.at(from);
    this.form.markAsDirty();
    this.exercises.removeAt(from, { emitEvent: false });
    this.exercises.insert(to, group);
    this.announce(
      `${group.controls.exercise.value.name} déplacé en position ${to + 1} sur ${this.exercises.length}`,
    );
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }

  private focusLater(id: string): void {
    afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
  }

  /**
   * Une erreur de l'API ne vaut que pour la séance envoyée : on retire celle du champ modifié,
   * et toutes celles qui suivent un index quand une liste change (ajout, retrait, déplacement).
   */
  private forgetServerErrors(source: AbstractControl): void {
    if (Object.keys(this.visibleServerErrors()).length === 0) {
      return;
    }
    if (source === this.form.controls.name || source === this.form.controls.description) {
      this.dropErrors((key) => key === (source === this.form.controls.name ? 'name' : 'description'));
      return;
    }
    if (source === this.exercises) {
      this.dropErrors((key) => key.startsWith('exercises'));
      return;
    }
    this.exercises.controls.forEach((exercise, i) => {
      const prefix = `exercises[${i}]`;
      if (source === exercise.controls.note) {
        this.dropErrors((key) => key === `${prefix}.note`);
      } else if (source === exercise.controls.sets) {
        this.dropErrors((key) => key.startsWith(`${prefix}.sets`));
      } else {
        exercise.controls.sets.controls.forEach((set, j) => {
          const setPath = `${prefix}.sets[${j}]`;
          for (const field of ['reps', 'loadKg', 'restSeconds'] as const) {
            if (source === set.controls[field]) {
              this.dropErrors((key) => key === `${setPath}.${field}` || key === setPath);
            }
          }
        });
      }
    });
  }

  private dropErrors(matches: (key: string) => boolean): void {
    this.visibleServerErrors.update((errors) =>
      Object.fromEntries(Object.entries(errors).filter(([key]) => !matches(key))),
    );
  }
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
