import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';

export interface ForgotPasswordRequest {
  email: string;
}

/** Formulaire de demande de réinitialisation du mot de passe (US08). */
@Component({
  selector: 'app-forgot-password-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, FormFieldComponent],
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './forgot-password-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordFormComponent {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<ForgotPasswordRequest>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.submitting());

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const { email } = this.form.getRawValue();
    this.submitted.emit({ email: email.trim().toLowerCase() });
  }
}
