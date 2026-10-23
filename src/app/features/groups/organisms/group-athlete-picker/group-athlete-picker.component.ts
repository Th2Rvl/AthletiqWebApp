import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { AthleteSummary, Uuid } from '../../../../core/api/models/api.models';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';

/** Option du sélecteur : l'athlète et un libellé « Prénom Nom (e-mail) » sur lequel filtrer. */
interface AthleteOption {
  id: Uuid;
  label: string;
}

/**
 * Sélecteur d'athlètes à ajouter à un groupe (US14), en sélection multiple avec recherche.
 * La page ne lui donne que les athlètes du coach qui ne sont pas déjà dans le groupe.
 */
@Component({
  selector: 'app-group-athlete-picker',
  imports: [FormsModule, ButtonModule, MultiSelectModule, SkeletonModule, ErrorStateComponent],
  templateUrl: './group-athlete-picker.component.html',
  styleUrl: './group-athlete-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupAthletePickerComponent {
  readonly athletes = input.required<AthleteSummary[]>();
  readonly loaded = input(false);
  /** Message d'erreur du chargement des athlètes, `null` s'il a réussi. */
  readonly errorMessage = input<string | null>(null);
  readonly saving = input(false);

  readonly submitted = output<Uuid[]>();
  readonly cancelled = output<void>();
  readonly retry = output<void>();

  protected readonly selected = signal<Uuid[]>([]);

  protected options(): AthleteOption[] {
    return this.athletes().map((athlete) => ({
      id: athlete.id,
      label: `${athlete.firstName} ${athlete.lastName} (${athlete.email})`,
    }));
  }

  protected submit(): void {
    if (this.selected().length > 0 && !this.saving()) {
      this.submitted.emit(this.selected());
    }
  }
}
