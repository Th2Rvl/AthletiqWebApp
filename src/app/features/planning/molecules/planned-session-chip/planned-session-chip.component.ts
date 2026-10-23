import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';

/**
 * Séance dans une case du calendrier : nom, précision courte (« 5 exercices » ou
 * « 3/4 athlètes ») et `p-tag` « Passée » pour une séance verrouillée, comme sur le mobile.
 * Un bouton natif : toute la pastille ouvre le détail, au clic comme au clavier.
 */
@Component({
  selector: 'app-planned-session-chip',
  imports: [TagModule],
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
