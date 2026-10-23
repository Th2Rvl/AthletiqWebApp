import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { DuplicateWeekPayload, IsoDate } from '../../../../core/api/models/api.models';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import {
  DUPLICATE_WEEKS_MAX,
  DUPLICATE_WEEKS_MIN,
  addDays,
  periodLabel,
} from '../../planning-dates';

/** Semaine source proposée : son lundi, son libellé et le nombre de séances qu'elle contient. */
export interface WeekOption {
  weekStart: IsoDate;
  label: string;
  sessionCount: number;
}

/**
 * Dupliquer une semaine (US26) : la semaine source (lundi → dimanche, `p-select`) et le nombre
 * de semaines suivantes à remplir (1 à 12, `p-inputnumber`). Les copies gardent le jour de la
 * semaine et le même contenu que la source. Une semaine vide ne se duplique pas.
 */
@Component({
  selector: 'app-duplicate-week-form',
  imports: [
    FormsModule,
    ButtonModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    FormFieldComponent,
  ],
  templateUrl: './duplicate-week-form.component.html',
  styleUrl: './duplicate-week-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuplicateWeekFormComponent {
  readonly weeks = input.required<WeekOption[]>();
  /** Semaine proposée à l'ouverture. */
  readonly initialWeekStart = input<IsoDate | null>(null);
  readonly targetLabel = input.required<string>();
  readonly saving = input(false);
  readonly serverErrors = input<Record<string, string>>({});
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<DuplicateWeekPayload>();
  readonly cancelled = output<void>();

  protected readonly min = DUPLICATE_WEEKS_MIN;
  protected readonly max = DUPLICATE_WEEKS_MAX;

  protected readonly weekStart = linkedSignal<IsoDate | null>(() => {
    const initial = this.initialWeekStart();
    const options = this.weeks();
    return (
      options.find((week) => week.weekStart === initial)?.weekStart ?? options[0]?.weekStart ?? null
    );
  });
  protected readonly count = linkedSignal<number | null>(() => {
    this.weeks();
    return 1;
  });
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly source = computed(
    () => this.weeks().find((week) => week.weekStart === this.weekStart()) ?? null,
  );
  protected readonly sourceEmpty = computed(() => this.source()?.sessionCount === 0);
  protected readonly validCount = computed(() => {
    const count = this.count();
    return count !== null && Number.isInteger(count) && count >= this.min && count <= this.max;
  });
  protected readonly countError = computed(() =>
    this.validCount()
      ? (this.visibleServerErrors()['weeks'] ?? null)
      : `Entre ${this.min} et ${this.max} semaines`,
  );
  protected readonly weekError = computed(() => {
    if (this.sourceEmpty()) {
      return 'Aucune séance à dupliquer cette semaine';
    }
    return this.visibleServerErrors()['weekStart'] ?? null;
  });
  /** « Copie sur 16 nov. – 6 déc. 2026, 3 séances par semaine » */
  protected readonly summary = computed(() => {
    const source = this.source();
    const count = this.count();
    if (!source || !this.validCount() || count === null || source.sessionCount === 0) {
      return null;
    }
    const from = addDays(source.weekStart, 7);
    const to = addDays(source.weekStart, 7 * count + 6);
    const sessions = source.sessionCount > 1 ? `${source.sessionCount} séances` : '1 séance';
    return `Copie de ${sessions} sur la période ${periodLabel(from, to)}, ${this.targetLabel()}`;
  });
  protected readonly canSubmit = computed(
    () => !this.saving() && this.source() !== null && !this.sourceEmpty() && this.validCount(),
  );

  protected onWeek(value: IsoDate | null): void {
    this.weekStart.set(value);
    this.visibleServerErrors.set({});
  }

  protected onCount(value: number | null): void {
    this.count.set(value);
    this.visibleServerErrors.set({});
  }

  protected submit(): void {
    const weekStart = this.weekStart();
    const weeks = this.count();
    if (this.canSubmit() && weekStart !== null && weeks !== null) {
      this.submitted.emit({ weekStart, weeks });
    }
  }
}
