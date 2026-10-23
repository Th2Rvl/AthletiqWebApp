import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MuscleGroup } from '../../../../core/api/models/api.models';
import { MUSCLE_GROUP_OPTIONS } from '../../exercise-labels';

/**
 * Barre de recherche et de filtres de la bibliothèque (US17) : nom, groupe musculaire et
 * matériel. Une seule fonction, la sélection des exercices affichés ; elle ne fait aucun
 * appel à l'API, elle émet les changements vers la page.
 */
@Component({
  selector: 'app-exercise-filters',
  imports: [FormsModule, IconFieldModule, InputIconModule, InputTextModule, SelectModule],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './exercise-filters.component.html',
  styleUrl: './exercise-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseFiltersComponent {
  readonly query = input('');
  readonly muscleGroup = input<MuscleGroup | null>(null);
  readonly equipment = input('');

  readonly queryChange = output<string>();
  readonly muscleGroupChange = output<MuscleGroup | null>();
  readonly equipmentChange = output<string>();

  protected readonly muscleGroupOptions = MUSCLE_GROUP_OPTIONS;

  protected onQueryInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  protected onEquipmentInput(event: Event): void {
    this.equipmentChange.emit((event.target as HTMLInputElement).value);
  }
}
