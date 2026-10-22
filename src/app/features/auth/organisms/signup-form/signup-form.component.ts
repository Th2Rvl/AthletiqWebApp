import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { passwordStrength } from '../../../../shared/forms/validators';

export interface SignupCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Formulaire de création d'un compte coach (US06). La robustesse du mot de passe est
 * contrôlée ici comme côté API, mais l'API reste la source de vérité.
 */
@Component({
  selector: 'app-signup-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, FormFieldComponent],
  templateUrl: './signup-form.component.html',
  styleUrl: './signup-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupFormComponent {
  readonly submitting = input(false);
  /** Erreur à afficher au-dessus du bouton (e-mail déjà utilisé, serveur absent). */
  readonly error = input<string | null>(null);

  readonly submitted = output<SignupCredentials>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72), passwordStrength]],
    passwordConfirmation: ['', [Validators.required, Validators.maxLength(72)]],
  });

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.submitting());

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const { firstName, lastName, email, password, passwordConfirmation } = this.form.getRawValue();
    if (password !== passwordConfirmation) {
      this.form.controls.passwordConfirmation.setErrors({ mismatch: true });
      this.form.controls.passwordConfirmation.markAsTouched();
      return;
    }
    this.submitted.emit({
      email: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  }
}
