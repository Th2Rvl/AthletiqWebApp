import { DatePipe } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { map } from 'rxjs';
import { AthleteInvitation } from '../../../../core/api/models/api.models';
import { trimmedLength } from '../../../../shared/forms/validators';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';

export const LABEL_MAX = 100;

/** Affiche un code de 8 caractères sous la forme « XXXX-XXXX » (le contrat l'envoie sans tiret). */
export function formatInvitationCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/**
 * Panneau des codes d'invitation d'athlète (US10) : codes en attente avec leur expiration,
 * copie, régénération et révocation, et formulaire pour en générer un nouveau.
 * Un code est à usage unique : le libellé sert à reconnaître l'athlète attendu.
 * Purement présentationnel : la page porte les appels à l'API et le presse-papiers.
 */
@Component({
  selector: 'app-invitation-panel',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    ErrorStateComponent,
    FormFieldComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './invitation-panel.component.html',
  styleUrl: './invitation-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationPanelComponent {
  readonly invitations = input.required<AthleteInvitation[]>();
  readonly loaded = input(true);
  readonly loading = input(false);
  /** Message d'erreur du chargement, `null` s'il a réussi. */
  readonly errorMessage = input<string | null>(null);
  readonly creating = input(false);
  /** Erreurs renvoyées par l'API à la création, par nom de champ JSON (`label`). */
  readonly serverErrors = input<Record<string, string>>({});

  readonly create = output<string>();
  readonly copy = output<AthleteInvitation>();
  readonly regenerate = output<AthleteInvitation>();
  readonly revoke = output<AthleteInvitation>();
  readonly retry = output<void>();

  protected readonly format = formatInvitationCode;
  protected readonly labelMax = LABEL_MAX;
  protected readonly form = inject(NonNullableFormBuilder).group({
    label: ['', [trimmedLength(1, LABEL_MAX)]],
  });

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.creating());
  protected readonly labelError = computed(() => {
    this.value();
    const control = this.form.controls.label;
    if (control.hasError('trimmedLength')) {
      return `Le libellé ne doit pas dépasser ${LABEL_MAX} caractères`;
    }
    return this.visibleServerErrors()['label'] ?? null;
  });

  constructor() {
    this.form.controls.label.valueChanges.subscribe(() =>
      this.visibleServerErrors.update(({ label: _removed, ...others }) => others),
    );
    // Le champ est vidé quand une création vient d'aboutir (la page repasse `creating` à faux
    // sans erreur) : on repère la fin d'une création réussie.
    let wasCreating = false;
    effect(() => {
      const creating = this.creating();
      const failed = Object.keys(this.serverErrors()).length > 0;
      if (wasCreating && !creating && !failed) {
        this.form.reset({ label: '' });
      }
      wasCreating = creating;
    });
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    this.create.emit(this.form.getRawValue().label.trim());
  }
}
