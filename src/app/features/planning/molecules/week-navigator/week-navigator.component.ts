import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Navigation du calendrier par semaine (planche W4) : précédente et suivante en boutons icône
 * autour de la période affichée, puis « Aujourd'hui » (conservé, décision #70). Trois
 * `p-button` et un libellé : une seule fonction, changer de période.
 */
@Component({
  selector: 'app-week-navigator',
  imports: [ButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <button
      pButton
      type="button"
      severity="secondary"
      iconOnly
      class="week-navigator__step"
      aria-label="Semaine précédente"
      (click)="previous.emit()"
    >
      <ion-icon name="chevron-back-outline" aria-hidden="true"></ion-icon>
    </button>
    <p class="week-navigator__label" aria-live="polite">{{ label() }}</p>
    <button
      pButton
      type="button"
      severity="secondary"
      iconOnly
      class="week-navigator__step"
      aria-label="Semaine suivante"
      (click)="next.emit()"
    >
      <ion-icon name="chevron-forward-outline" aria-hidden="true"></ion-icon>
    </button>
    <button pButton type="button" severity="secondary" text (click)="today.emit()">
      Aujourd'hui
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-1);
    }
    /* Boutons de période de la planche W4 : 40 × 40 sur surface, sans bordure. */
    .week-navigator__step {
      border-color: var(--ath-surface);
      background: var(--ath-surface);
    }
    .week-navigator__label {
      margin: 0;
      padding-inline: var(--ath-space-3);
      font-weight: var(--ath-weight-medium);
      font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekNavigatorComponent {
  /** Période affichée, par exemple « 2 nov. – 29 nov. 2026 ». */
  readonly label = input.required<string>();

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
}
