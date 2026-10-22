import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';

export const EMAIL_MAX = 254;

/**
 * Formulaire d'invitation d'un coach par e-mail (US03).
 * Émet l'e-mail normalisé comme l'API le fera (trim + minuscules).
 */
@Component({
  selector: 'app-invitation-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, FormFieldComponent],
  templateUrl: './invitation-form.component.html',
  styleUrl: './invitation-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationFormComponent {
  readonly saving = input(false);
  /** Erreurs renvoyées par l'API, par nom de champ JSON (`email`). */
  readonly serverErrors = input<Record<string, string>>({});

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX)]],
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.saving());

  protected readonly emailError = computed(() => {
    this.value();
    const control = this.form.controls.email;
    if (control.touched || control.dirty) {
      if (control.hasError('required')) {
        return "L'e-mail est obligatoire";
      }
      if (control.hasError('email')) {
        return "L'e-mail n'est pas valide";
      }
      if (control.hasError('maxlength')) {
        return `L'e-mail ne doit pas dépasser ${EMAIL_MAX} caractères`;
      }
    }
    return this.visibleServerErrors()['email'] ?? null;
  });

  constructor() {
    this.form.controls.email.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.visibleServerErrors()['email']) {
        this.visibleServerErrors.set({});
      }
    });
  }

  /** Vide le champ, par exemple pour inviter un autre coach après un succès. */
  reset(): void {
    this.form.reset({ email: '' });
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue().email.trim().toLowerCase());
  }
}
