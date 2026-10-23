import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { IsoDate, PlanSessionPayload, Uuid } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { fromPickerDate, longDay, toPickerDate } from '../../planning-dates';

export interface WorkoutOption {
  id: Uuid;
  name: string;
}

/**
 * Planifier une séance (US21, US22) : le jour (`p-datepicker`, saisie au clavier possible,
 * jours passés désactivés) et la séance à copier (`p-select` filtrable). La validation reste
 * bloquée tant qu'aucune séance n'est choisie ou que le jour est passé.
 *
 * Le jour vient de `p-datepicker` sous forme de `Date` locale : il est relu dans ses
 * composantes locales (`fromPickerDate`), jamais via `toISOString()`.
 */
@Component({
  selector: 'app-plan-session-form',
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    MessageModule,
    SelectModule,
    EmptyStateComponent,
    ErrorStateComponent,
    FormFieldComponent,
  ],
  templateUrl: './plan-session-form.component.html',
  styleUrl: './plan-session-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanSessionFormComponent {
  /** Jour proposé (case cliquée, ou aujourd'hui). */
  readonly date = input.required<IsoDate>();
  /** Aujourd'hui selon l'API : premier jour sélectionnable. */
  readonly today = input.required<IsoDate>();
  /** « Lucas Durand » ou « groupe Demi-fond » : pour qui la séance est planifiée. */
  readonly targetLabel = input.required<string>();
  readonly workouts = input<WorkoutOption[]>([]);
  readonly workoutsLoaded = input(true);
  readonly workoutsError = input<string | null>(null);
  readonly saving = input(false);
  /** Erreurs de l'API par champ JSON (`date`, `workoutId`). */
  readonly serverErrors = input<Record<string, string>>({});
  /** Erreur de l'API sans champ, affichée au-dessus des actions. */
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<PlanSessionPayload>();
  readonly cancelled = output<void>();
  readonly retryWorkouts = output<void>();
  readonly createWorkout = output<void>();

  protected readonly pickedDate = linkedSignal<Date | null>(() => toPickerDate(this.date()));
  protected readonly workoutId = signal<Uuid | null>(null);
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly minDate = computed(() => toPickerDate(this.today()));
  protected readonly isoDate = computed(() => {
    const picked = this.pickedDate();
    return picked ? fromPickerDate(picked) : null;
  });
  protected readonly noWorkout = computed(
    () => this.workoutsLoaded() && !this.workoutsError() && this.workouts().length === 0,
  );
  protected readonly dateError = computed(() => {
    const date = this.isoDate();
    if (date === null) {
      return 'Choisissez un jour';
    }
    if (date < this.today()) {
      return "Choisissez aujourd'hui ou un jour à venir";
    }
    return this.visibleServerErrors()['date'] ?? null;
  });
  protected readonly workoutError = computed(() => this.visibleServerErrors()['workoutId'] ?? null);
  protected readonly summary = computed(() => {
    const date = this.isoDate();
    return date ? `${this.targetLabel()}, ${longDay(date)}` : this.targetLabel();
  });
  protected readonly canSubmit = computed(
    () =>
      !this.saving() &&
      this.workoutId() !== null &&
      this.isoDate() !== null &&
      (this.isoDate() as IsoDate) >= this.today(),
  );

  protected onDate(value: Date | null): void {
    this.pickedDate.set(value);
    this.visibleServerErrors.update(({ date: _removed, ...others }) => others);
  }

  protected onWorkout(value: Uuid | null): void {
    this.workoutId.set(value);
    this.visibleServerErrors.update(({ workoutId: _removed, ...others }) => others);
  }

  protected submit(): void {
    const workoutId = this.workoutId();
    const date = this.isoDate();
    if (!this.canSubmit() || workoutId === null || date === null) {
      return;
    }
    this.submitted.emit({ workoutId, date });
  }
}
