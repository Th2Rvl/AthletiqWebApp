import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { map } from 'rxjs';
import { Exercise, ExercisePayload, MuscleGroup } from '../../../../core/api/models/api.models';
import { httpUrl, trimmedLength } from '../../../../shared/forms/validators';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { MUSCLE_GROUP_OPTIONS } from '../../exercise-labels';

export const EXERCISE_NAME_MAX = 200;
export const EXERCISE_DESCRIPTION_MAX = 1000;
export const EXERCISE_EQUIPMENT_MAX = 100;
export const EXERCISE_VIDEO_URL_MAX = 500;

/**
 * Formulaire de création ou de modification d'un exercice (US15, US16). Valide comme l'API,
 * affiche sous chaque champ l'erreur du serveur (400 de validation, 409 de nom déjà pris),
 * et émet une valeur normalisée : espaces de bord retirés, champ facultatif vide à `null`.
 */
@Component({
  selector: 'app-exercise-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    FormFieldComponent,
  ],
  templateUrl: './exercise-form.component.html',
  styleUrl: './exercise-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseFormComponent {
  /** Exercice à modifier, ou `null` pour une création. */
  readonly exercise = input<Exercise | null>(null);
  readonly saving = input(false);
  /** Erreurs renvoyées par l'API, par nom de champ JSON (`name`, `videoUrl`…). */
  readonly serverErrors = input<Record<string, string>>({});

  readonly submitted = output<ExercisePayload>();
  readonly cancelled = output<void>();

  protected readonly muscleGroupOptions = MUSCLE_GROUP_OPTIONS;
  protected readonly descriptionMax = EXERCISE_DESCRIPTION_MAX;
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [trimmedLength(1, EXERCISE_NAME_MAX)]],
    description: ['', [trimmedLength(0, EXERCISE_DESCRIPTION_MAX)]],
    muscleGroup: ['' as MuscleGroup | '', [Validators.required]],
    equipment: ['', [trimmedLength(0, EXERCISE_EQUIPMENT_MAX)]],
    videoUrl: ['', [trimmedLength(0, EXERCISE_VIDEO_URL_MAX), httpUrl]],
  });

  private readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  /** Erreurs serveur encore affichées : celle d'un champ disparaît dès qu'on le modifie. */
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly isEdit = computed(() => this.exercise() !== null);
  protected readonly submitLabel = computed(() =>
    this.isEdit() ? 'Enregistrer les modifications' : "Créer l'exercice",
  );
  protected readonly descriptionLength = computed(() => this.value().description.length);
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.saving());

  protected readonly nameError = computed(() => {
    this.value();
    const control = this.form.controls.name;
    if (control.hasError('trimmedLength')) {
      return `Le nom doit contenir entre 1 et ${EXERCISE_NAME_MAX} caractères`;
    }
    if (control.hasError('required') && control.dirty) {
      return 'Le nom est obligatoire';
    }
    return this.visibleServerErrors()['name'] ?? null;
  });
  protected readonly descriptionError = computed(() => {
    this.value();
    if (this.form.controls.description.hasError('trimmedLength')) {
      return `La description ne doit pas dépasser ${EXERCISE_DESCRIPTION_MAX} caractères`;
    }
    return this.visibleServerErrors()['description'] ?? null;
  });
  protected readonly muscleGroupError = computed(() => {
    this.value();
    const control = this.form.controls.muscleGroup;
    if (control.hasError('required') && control.touched) {
      return 'Choisissez un groupe musculaire';
    }
    return this.visibleServerErrors()['muscleGroup'] ?? null;
  });
  protected readonly equipmentError = computed(() => {
    this.value();
    if (this.form.controls.equipment.hasError('trimmedLength')) {
      return `Le matériel ne doit pas dépasser ${EXERCISE_EQUIPMENT_MAX} caractères`;
    }
    return this.visibleServerErrors()['equipment'] ?? null;
  });
  protected readonly videoUrlError = computed(() => {
    this.value();
    const control = this.form.controls.videoUrl;
    if (control.hasError('trimmedLength')) {
      return `Le lien ne doit pas dépasser ${EXERCISE_VIDEO_URL_MAX} caractères`;
    }
    if (control.hasError('httpUrl')) {
      return 'Saisissez une adresse web complète, qui commence par https://';
    }
    return this.visibleServerErrors()['videoUrl'] ?? null;
  });

  constructor() {
    effect(() => {
      const exercise = this.exercise();
      this.form.reset({
        name: exercise?.name ?? '',
        description: exercise?.description ?? '',
        muscleGroup: exercise?.muscleGroup ?? '',
        equipment: exercise?.equipment ?? '',
        videoUrl: exercise?.videoUrl ?? '',
      });
    });
    for (const name of ['name', 'description', 'equipment', 'videoUrl'] as const) {
      this.form.controls[name].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.visibleServerErrors.update((errors) => withoutKey(errors, name)));
    }
    this.form.controls.muscleGroup.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.visibleServerErrors.update((errors) => withoutKey(errors, 'muscleGroup')),
      );
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      name: raw.name.trim(),
      description: orNull(raw.description),
      muscleGroup: raw.muscleGroup as MuscleGroup,
      equipment: orNull(raw.equipment),
      videoUrl: orNull(raw.videoUrl),
    });
  }
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function withoutKey(errors: Record<string, string>, key: string): Record<string, string> {
  const { [key]: _removed, ...others } = errors;
  return others;
}
