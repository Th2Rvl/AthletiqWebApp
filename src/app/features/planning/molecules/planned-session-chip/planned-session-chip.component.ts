import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Séance dans une case du calendrier (planche W4) : nom, puis l'état (« Planifiée » ou
 * « Passée » pour une séance verrouillée) et une précision courte (« 5 exercices » ou
 * « 3/4 athlètes »). Les états réalisés de la planche (« 6 / 6 réalisées »…) attendent les
 * données de suivi (décision #70). Un bouton natif : toute la pastille ouvre le détail.
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
  /** Libellé complet lu par les lecteurs d'écran (nom, jour, précision, état). */
  readonly ariaLabel = input<string | null>(null);

  readonly selected = output<void>();
}
