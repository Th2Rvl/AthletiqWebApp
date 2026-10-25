import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { GroupCalendarEntry, Uuid } from '../../../../core/api/models/api.models';
import { sessionStatusLabel, sessionStatusSeverity } from '../../../../shared/ui/session-status';
import { longDay } from '../../planning-dates';

/**
 * Séance d'un groupe un jour donné (US24, Q8) : « Haut du corps A, 3/4 athlètes » et la liste
 * des membres actuels qui l'ont, avec le statut de chacune une fois réalisée ou non faite (#7).
 * Chaque séance planifiée reste individuelle : on l'ouvre pour la voir, la déplacer ou l'annuler.
 */
@Component({
  selector: 'app-group-session-list',
  imports: [ButtonModule, TagModule],
  template: `
    <p class="group-sessions__summary">
      {{ dayLabel() }}, {{ entry().athleteCount }}/{{ entry().memberCount }}
      {{ entry().memberCount > 1 ? 'athlètes' : 'athlète' }}
      @if (entry().locked) {
        <p-tag severity="secondary" value="Passée" />
      }
    </p>
    <ul class="group-sessions__list">
      @for (session of entry().sessions; track session.id) {
        <li class="group-sessions__item">
          <span class="group-sessions__who">
            <span class="group-sessions__name">{{ session.lastName }} {{ session.firstName }}</span>
            @if (session.status !== 'UPCOMING') {
              <p-tag
                [severity]="statusSeverity(session.status)"
                [value]="statusLabel(session.status)"
              />
            }
          </span>
          <button
            pButton
            type="button"
            size="small"
            severity="secondary"
            text
            [attr.aria-label]="'Voir la séance de ' + session.firstName + ' ' + session.lastName"
            (click)="open.emit(session.id)"
          >
            Voir la séance
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ath-space-3);
    }
    .group-sessions__summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-2);
      margin: 0;
      color: var(--ath-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .group-sessions__list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .group-sessions__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ath-space-3);
      padding-block: var(--ath-space-2);
      border-bottom: var(--ath-line-width) solid var(--ath-line);
    }
    .group-sessions__who {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-2);
    }
    .group-sessions__name {
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupSessionListComponent {
  readonly entry = input.required<GroupCalendarEntry>();
  readonly open = output<Uuid>();

  protected readonly dayLabel = computed(() => longDay(this.entry().date));
  protected readonly statusLabel = sessionStatusLabel;
  protected readonly statusSeverity = sessionStatusSeverity;
}
