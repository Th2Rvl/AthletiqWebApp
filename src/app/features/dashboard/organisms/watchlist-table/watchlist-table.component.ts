import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { WatchlistEntry } from '../../../../core/api/models/api.models';
import { formatRate, watchReasonLabel } from '../../kpi-format';

/**
 * Athlètes « À surveiller » (US32), dans l'ordre de l'API (non faites décroissantes) : nom
 * menant à leur suivi, motifs, non faites sur la période et taux de réalisation. Une liste vide
 * le dit en une ligne : c'est une bonne nouvelle, pas un état à remplir.
 */
@Component({
  selector: 'app-watchlist-table',
  imports: [RouterLink, TableModule, TagModule],
  template: `
    @if (entries().length === 0) {
      <p class="watchlist__none">Aucun athlète à surveiller sur cette période.</p>
    } @else {
      <p-table [value]="entries()" size="small" dataKey="athleteId">
        <ng-template #header>
          <tr>
            <th scope="col">Athlète</th>
            <th scope="col">Motifs</th>
            <th scope="col" class="numeric">Non faites</th>
            <th scope="col" class="numeric">Taux de réalisation</th>
          </tr>
        </ng-template>
        <ng-template #body let-entry>
          <tr>
            <td class="watchlist__name">
              <a [routerLink]="['/athletes', entry.athleteId, 'suivi']">
                {{ entry.lastName }} {{ entry.firstName }}
              </a>
            </td>
            <td>
              <span class="watchlist__reasons">
                @for (reason of entry.reasons; track reason) {
                  <p-tag severity="warn" [value]="reasonLabel(reason, entry.missedLast7Days)" />
                }
              </span>
            </td>
            <td class="numeric">{{ entry.missedCount }}</td>
            <td class="numeric">{{ formatRate(entry.completionRate) }}</td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .watchlist__none {
      margin: 0;
      color: var(--ath-text-muted);
    }
    .watchlist__name {
      font-weight: var(--ath-weight-medium);
      overflow-wrap: anywhere;
    }
    .watchlist__reasons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ath-space-1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistTableComponent {
  readonly entries = input.required<WatchlistEntry[]>();

  protected readonly reasonLabel = watchReasonLabel;
  protected readonly formatRate = formatRate;
}
