import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { CoachProfile } from '../../../../core/api/models/api.models';

export interface ProfileChanges {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Formulaire de modification du profil du coach (US09). Le rôle et le mot de passe n'y
 * figurent pas : le rôle est fixé à la création et le mot de passe a son propre parcours.
 */
@Component({
  selector: 'app-profile-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, FormFieldComponent],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent {
  /** Profil affiché : le formulaire se remplit à son arrivée. */
  readonly profile = input.required<CoachProfile>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<ProfileChanges>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  constructor() {
    // Le formulaire suit le profil affiché : le remplir à chaque changement évite un état
    // dupliqué dans la page.
    effect(() => {
      const profile = this.profile();
      this.form.setValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
      });
    });
  }

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.submitting());

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const { firstName, lastName, email } = this.form.getRawValue();
    this.submitted.emit({
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  }
}
