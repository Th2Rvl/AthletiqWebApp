import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AthleteKpi } from '../../../../core/api/models/api.models';
import { formatRate, formatRpe } from '../../kpi-format';

/**
 * Indicateurs par athlète (US32), dans l'ordre de l'API (nom puis prénom), athlètes sans
 * séance compris : taux de réalisation, réalisées, non faites (dont les 7 derniers jours),
 * RPE moyen et « À surveiller ». Le nom mène au suivi de l'athlète.
 */
@Component({
  selector: 'app-athlete-kpi-table',
  imports: [RouterLink, TableModule, TagModule],
  template: `
    <p-table [value]="athletes()" size="small" dataKey="athleteId">
      <ng-template #header>
        <tr>
          <th scope="col">Athlète</th>
          <th scope="col" class="numeric">Taux de réalisation</th>
          <th scope="col" class="numeric">Réalisées</th>
          <th scope="col" class="numeric">Non faites</th>
          <th scope="col" class="numeric">Dont 7 derniers jours</th>
          <th scope="col" class="numeric">RPE moyen</th>
          <th scope="col"><span class="visually-hidden">Alerte</span></th>
        </tr>
      </ng-template>
      <ng-template #body let-athlete>
        <tr>
          <td class="kpi-table__name">
            <a [routerLink]="['/athletes', athlete.athleteId, 'suivi']">
              {{ athlete.lastName }} {{ athlete.firstName }}
            </a>
          </td>
          <td class="numeric">{{ formatRate(athlete.completionRate) }}</td>
          <td class="numeric">{{ athlete.doneCount }}</td>
          <td class="numeric">{{ athlete.missedCount }}</td>
          <td class="numeric">{{ athlete.missedLast7Days }}</td>
          <td class="numeric">{{ formatRpe(athlete.averageRpe) }}</td>
          <td>
            @if (athlete.watch) {
              <p-tag severity="warn" value="À surveiller" />
            }
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  styles: `
    :host {
      display: block;
    }
    .kpi-table__name {
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteKpiTableComponent {
  readonly athletes = input.required<AthleteKpi[]>();

  protected readonly formatRate = formatRate;
  protected readonly formatRpe = formatRpe;
}
