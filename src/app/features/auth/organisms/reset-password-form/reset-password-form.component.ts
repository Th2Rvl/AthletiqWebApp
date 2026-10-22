import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { passwordStrength } from '../../../../shared/forms/validators';

export interface NewPassword {
  password: string;
  passwordConfirmation: string;
}

/** Formulaire de nouveau mot de passe (US08). */
@Component({
  selector: 'app-reset-password-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, FormFieldComponent],
  templateUrl: './reset-password-form.component.html',
  styleUrl: './reset-password-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordFormComponent {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<NewPassword>();

  protected readonly form = inject(NonNullableFormBuilder).group({
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
    const { password, passwordConfirmation } = this.form.getRawValue();
    if (password !== passwordConfirmation) {
      this.form.controls.passwordConfirmation.setErrors({ mismatch: true });
      this.form.controls.passwordConfirmation.markAsTouched();
      return;
    }
    this.submitted.emit({ password, passwordConfirmation });
  }
}
