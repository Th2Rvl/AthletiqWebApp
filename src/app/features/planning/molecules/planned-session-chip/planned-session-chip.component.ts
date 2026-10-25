import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SessionStatus } from '../../../../core/api/models/api.models';
import { sessionStatusLabel } from '../../../../shared/ui/session-status';

/**
 * Séance dans une case du calendrier (planche W4) : nom, puis l'état et une précision courte
 * (« 5 exercices » ou « 3/4 athlètes »). L'état suit le statut de la séance (#7) : « Planifiée »,
 * « Réalisée » (succès) ou « Non faite » (danger), avec les libellés et couleurs du badge de
 * statut ; un groupe peut imposer le sien (« 2/3 réalisées »). Un bouton natif : toute la
 * pastille ouvre le détail.
 */
@Component({
  selector: 'app-planned-session-chip',
  templateUrl: './planned-session-chip.component.html',
  styleUrl: './planned-session-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedSessionChipComponent {
  readonly name = input.required<string>();
  readonly meta = input<string | null>(null);
  readonly locked = input(false);
  readonly status = input<SessionStatus>('UPCOMING');
  /** Libellé d'état imposé (séance de groupe), à la place de celui du statut. */
  readonly stateLabel = input<string | null>(null);
  /** Libellé complet lu par les lecteurs d'écran (nom, jour, précision, état). */
  readonly ariaLabel = input<string | null>(null);

  readonly selected = output<void>();

  protected readonly state = computed(() => this.stateLabel() ?? sessionStatusLabel(this.status()));
}
