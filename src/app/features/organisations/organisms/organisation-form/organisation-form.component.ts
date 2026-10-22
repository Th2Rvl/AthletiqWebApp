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
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { map } from 'rxjs';
import { Organisation, OrganisationPayload } from '../../../../core/api/models/api.models';
import { trimmedLength } from '../../../../shared/forms/validators';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 500;

/**
 * Formulaire de création ou de modification d'une organisation (US01, US02).
 * Valide comme l'API (RM2), affiche les erreurs renvoyées par le serveur sous chaque champ,
 * et émet une valeur déjà normalisée (trim, description vide → `null`).
 */
@Component({
  selector: 'app-organisation-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule, FormFieldComponent],
  templateUrl: './organisation-form.component.html',
  styleUrl: './organisation-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationFormComponent {
  /** Organisation à modifier, ou `null` pour une création. */
  readonly organisation = input<Organisation | null>(null);
  readonly saving = input(false);
  /** Erreurs renvoyées par l'API, par nom de champ JSON (`name`, `description`). */
  readonly serverErrors = input<Record<string, string>>({});

  readonly submitted = output<OrganisationPayload>();
  readonly cancelled = output<void>();

  protected readonly descriptionMax = DESCRIPTION_MAX;
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [trimmedLength(NAME_MIN, NAME_MAX)]],
    description: ['', [trimmedLength(0, DESCRIPTION_MAX)]],
  });

  private readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  /** Erreurs serveur encore affichées : celle d'un champ disparaît dès qu'on le modifie. */
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  protected readonly isEdit = computed(() => this.organisation() !== null);
  protected readonly submitLabel = computed(() =>
    this.isEdit() ? 'Enregistrer les modifications' : "Créer l'organisation",
  );
  protected readonly descriptionLength = computed(() => this.value().description.length);
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.saving());

  protected readonly nameError = computed(() => {
    this.value();
    const control = this.form.controls.name;
    if (control.touched || control.dirty) {
      if (control.hasError('required')) {
        return 'Le nom est obligatoire';
      }
      if (control.hasError('trimmedLength')) {
        return `Le nom doit contenir entre ${NAME_MIN} et ${NAME_MAX} caractères`;
      }
    }
    return this.visibleServerErrors()['name'] ?? null;
  });

  protected readonly descriptionError = computed(() => {
    this.value();
    if (this.form.controls.description.hasError('trimmedLength')) {
      return `La description ne doit pas dépasser ${DESCRIPTION_MAX} caractères`;
    }
    return this.visibleServerErrors()['description'] ?? null;
  });

  constructor() {
    // Le formulaire est réinitialisé à chaque organisation reçue (ouverture du dialog).
    effect(() => {
      const organisation = this.organisation();
      this.form.reset({
        name: organisation?.name ?? '',
        description: organisation?.description ?? '',
      });
    });

    for (const field of ['name', 'description'] as const) {
      this.form.controls[field].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.dismissServerError(field));
    }
  }

  private dismissServerError(field: string): void {
    if (this.visibleServerErrors()[field]) {
      this.visibleServerErrors.update(({ [field]: _removed, ...others }) => others);
    }
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description } = this.form.getRawValue();
    const trimmedDescription = description.trim();
    this.submitted.emit({
      name: name.trim(),
      description: trimmedDescription === '' ? null : trimmedDescription,
    });
  }
}
