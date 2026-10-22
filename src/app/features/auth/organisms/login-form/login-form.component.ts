import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';

export interface Credentials {
  email: string;
  password: string;
}

/** Formulaire de connexion (socle d'authentification, en attendant #2). */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, FormFieldComponent],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  readonly submitting = input(false);
  /** Erreur de connexion à afficher au-dessus du bouton (identifiants refusés, serveur absent). */
  readonly error = input<string | null>(null);

  readonly submitted = output<Credentials>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.submitting());

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitted.emit({ email: email.trim().toLowerCase(), password });
  }
}
