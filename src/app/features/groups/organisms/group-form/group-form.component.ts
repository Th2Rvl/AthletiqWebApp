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
import { map } from 'rxjs';
import { Group, GroupNamePayload } from '../../../../core/api/models/api.models';
import { trimmedLength } from '../../../../shared/forms/validators';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';

export const GROUP_NAME_MAX = 60;

/**
 * Formulaire de création ou de renommage d'un groupe (US13). Valide comme l'API (RM7 : 1 à 60
 * caractères après trim), affiche l'erreur du serveur sous le champ (nom déjà pris) et émet
 * un nom déjà normalisé.
 */
@Component({
  selector: 'app-group-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, FormFieldComponent],
  templateUrl: './group-form.component.html',
  styleUrl: './group-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupFormComponent {
  /** Groupe à renommer, ou `null` pour une création. */
  readonly group = input<Group | null>(null);
  readonly saving = input(false);
  /** Erreurs renvoyées par l'API, par nom de champ JSON (`name`). */
  readonly serverErrors = input<Record<string, string>>({});

  readonly submitted = output<GroupNamePayload>();
  readonly cancelled = output<void>();

  protected readonly nameMax = GROUP_NAME_MAX;
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [trimmedLength(1, GROUP_NAME_MAX)]],
  });

  private readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  /** Erreur serveur encore affichée : elle disparaît dès qu'on modifie le champ. */
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly isEdit = computed(() => this.group() !== null);
  protected readonly submitLabel = computed(() =>
    this.isEdit() ? 'Renommer le groupe' : 'Créer le groupe',
  );
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.saving());
  protected readonly nameError = computed(() => {
    this.value();
    const control = this.form.controls.name;
    if (control.hasError('trimmedLength')) {
      return `Le nom ne doit pas dépasser ${GROUP_NAME_MAX} caractères`;
    }
    if (control.hasError('required') && control.dirty) {
      return 'Le nom est obligatoire';
    }
    return this.visibleServerErrors()['name'] ?? null;
  });

  constructor() {
    effect(() => {
      this.form.reset({ name: this.group()?.name ?? '' });
    });
    this.form.controls.name.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.visibleServerErrors.update(({ name: _removed, ...others }) => others));
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({ name: this.form.getRawValue().name.trim() });
  }
}
