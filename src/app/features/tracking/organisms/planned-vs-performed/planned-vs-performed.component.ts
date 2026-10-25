import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ReviewedExercise, SessionStatus } from '../../../../core/api/models/api.models';
import { muscleGroupLabel } from '../../../exercises/exercise-labels';
import { DeltaValueComponent } from '../../atoms/delta-value/delta-value.component';
import { formatKg, formatSet } from '../../tracking-format';

/**
 * Prévu / réalisé d'une séance (US28), exercice par exercice. Le prévu vient de l'instantané
 * de la séance planifiée (RM5), jamais du modèle.
 *
 * - Séance réalisée : par série, le prévu à côté du réalisé et l'écart signé (« +2 rép. »,
 *   « -5 kg ») ; une série non faite affiche « Non faite » et compte 0 dans le volume. Par
 *   exercice, le volume prévu et réalisé (Σ répétitions × charge) et l'écart en %. Au poids du
 *   corps (charges prévues vides), ni volume ni écart de charge : on compare les répétitions.
 * - Séance non faite ou à venir : le prévu seul, sans colonne du réalisé.
 *
 * Tous les calculs viennent de l'API ; l'organisme ne fait que les afficher.
 */
@Component({
  selector: 'app-planned-vs-performed',
  imports: [TableModule, DeltaValueComponent],
  templateUrl: './planned-vs-performed.component.html',
  styleUrl: './planned-vs-performed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedVsPerformedComponent {
  readonly exercises = input.required<ReviewedExercise[]>();
  readonly status = input.required<SessionStatus>();

  /** Le réalisé n'existe que pour une séance réalisée. */
  protected readonly compare = computed(() => this.status() === 'DONE');

  protected readonly muscleGroupLabel = muscleGroupLabel;
  protected readonly formatKg = formatKg;
  protected readonly formatSet = formatSet;
}
