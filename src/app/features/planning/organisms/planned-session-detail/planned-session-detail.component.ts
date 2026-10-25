import { DecimalPipe } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IsoDate, PlannedSessionDetail } from '../../../../core/api/models/api.models';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { sessionStatusLabel, sessionStatusSeverity } from '../../../../shared/ui/session-status';
import { muscleGroupLabel } from '../../../exercises/exercise-labels';
import { formatRest } from '../../../workouts/workout-form';
import { fromPickerDate, longDay, toPickerDate } from '../../planning-dates';

/**
 * Détail d'une séance planifiée (US24) : l'instantané copié du modèle (exercices, séries,
 * répétitions, charge, repos) et, si elle n'est pas verrouillée, les actions « Déplacer »
 * (choix du jour au clavier dans `p-datepicker`) et « Annuler la séance » (US25).
 * Une séance passée ou réalisée (`locked`) n'offre aucune action ; réalisée (#7), elle mène à
 * son prévu / réalisé (« Voir le réalisé »). Le statut s'affiche avec le badge commun.
 */
@Component({
  selector: 'app-planned-session-detail',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    MessageModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ErrorStateComponent,
    FormFieldComponent,
  ],
  templateUrl: './planned-session-detail.component.html',
  styleUrl: './planned-session-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedSessionDetailComponent {
  readonly session = input<PlannedSessionDetail | null>(null);
  readonly errorMessage = input<string | null>(null);
  /** Aujourd'hui selon l'API : premier jour proposé pour un déplacement. */
  readonly today = input.required<IsoDate>();
  readonly saving = input(false);
  /** Erreurs de l'API par champ JSON (`date` d'un `409 PLANNING_DATE_IN_PAST`). */
  readonly serverErrors = input<Record<string, string>>({});

  readonly move = output<IsoDate>();
  readonly cancelSession = output<void>();
  readonly retry = output<void>();

  protected readonly moving = linkedSignal({ source: this.session, computation: () => false });
  protected readonly pickedDate = signal<Date | null>(null);
  private readonly visibleServerErrors = linkedSignal(() => this.serverErrors());

  protected readonly minDate = computed(() => toPickerDate(this.today()));
  protected readonly dateLabel = computed(() => {
    const session = this.session();
    return session ? longDay(session.date) : '';
  });
  protected readonly targetDate = computed(() => {
    const picked = this.pickedDate();
    return picked ? fromPickerDate(picked) : null;
  });
  protected readonly moveError = computed(() => {
    const date = this.targetDate();
    if (date !== null && date < this.today()) {
      return "Choisissez aujourd'hui ou un jour à venir";
    }
    return this.visibleServerErrors()['date'] ?? null;
  });
  protected readonly canMove = computed(() => {
    const date = this.targetDate();
    const session = this.session();
    return (
      !this.saving() &&
      session !== null &&
      date !== null &&
      date >= this.today() &&
      date !== session.date
    );
  });

  protected readonly muscleGroupLabel = muscleGroupLabel;
  protected readonly statusLabel = sessionStatusLabel;
  protected readonly statusSeverity = sessionStatusSeverity;
  protected readonly formatRest = formatRest;

  protected startMove(): void {
    const session = this.session();
    this.pickedDate.set(session ? toPickerDate(session.date) : null);
    this.visibleServerErrors.set({});
    this.moving.set(true);
  }

  protected onDate(value: Date | null): void {
    this.pickedDate.set(value);
    this.visibleServerErrors.set({});
  }

  protected confirmMove(): void {
    const date = this.targetDate();
    if (this.canMove() && date !== null) {
      this.move.emit(date);
    }
  }
}
