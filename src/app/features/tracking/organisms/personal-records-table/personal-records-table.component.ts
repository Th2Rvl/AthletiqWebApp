import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { PersonalRecord, Uuid } from '../../../../core/api/models/api.models';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { muscleGroupLabel } from '../../../exercises/exercise-labels';
import { formatKg, shortDay } from '../../tracking-format';

/**
 * Records personnels d'un athlète (US31), dans l'ordre de l'API (groupe musculaire puis nom) :
 * meilleure charge réalisée, répétitions de cette série et date, avec un lien vers la séance.
 * Au poids du corps, le record est le maximum de répétitions sur une série. Calculés par l'API
 * sur les seules séances réalisées de ce coach (RM7).
 */
@Component({
  selector: 'app-personal-records-table',
  imports: [RouterLink, TableModule, EmptyStateComponent],
  template: `
    @if (records().length === 0) {
      <app-empty-state
        message="Aucun record pour l'instant"
        detail="Les records apparaissent dès la première séance réalisée et validée par l'athlète."
      />
    } @else {
      <p-table [value]="records()" size="small" dataKey="exerciseId">
        <ng-template #header>
          <tr>
            <th scope="col">Groupe musculaire</th>
            <th scope="col">Exercice</th>
            <th scope="col" class="numeric">Record</th>
            <th scope="col" class="numeric">Répétitions</th>
            <th scope="col">Date</th>
          </tr>
        </ng-template>
        <ng-template #body let-record>
          <tr>
            <td class="records__muscle">{{ muscleGroupLabel(record.muscleGroup) }}</td>
            <td class="records__name">{{ record.exerciseName }}</td>
            <td class="numeric records__value">
              {{ record.loadKg === null ? 'Poids du corps' : formatKg(record.loadKg) }}
            </td>
            <td class="numeric">{{ record.reps }}</td>
            <td>
              <a [routerLink]="['/athletes', athleteId(), 'seances', record.plannedSessionId]">
                {{ shortDay(record.date) }}
              </a>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .records__muscle {
      color: var(--ath-text-muted);
    }
    .records__name {
      overflow-wrap: anywhere;
    }
    .records__value {
      font-weight: var(--ath-weight-semibold);
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalRecordsTableComponent {
  readonly athleteId = input.required<Uuid>();
  readonly records = input.required<PersonalRecord[]>();

  protected readonly muscleGroupLabel = muscleGroupLabel;
  protected readonly formatKg = formatKg;
  protected readonly shortDay = shortDay;
}
