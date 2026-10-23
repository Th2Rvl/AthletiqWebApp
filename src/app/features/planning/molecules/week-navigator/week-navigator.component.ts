import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Navigation du calendrier par semaine : précédente, « Aujourd'hui », suivante, et la période
 * affichée. Trois `p-button` et un libellé : une seule fonction, changer de période.
 */
@Component({
  selector: 'app-week-navigator',
  imports: [ButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="week-navigator__buttons">
      <button
        pButton
        type="button"
        severity="secondary"
        outlined
        aria-label="Semaine précédente"
        (click)="previous.emit()"
      >
        <ion-icon name="chevron-back-outline" aria-hidden="true"></ion-icon>
      </button>
      <button pButton type="button" severity="secondary" outlined (click)="today.emit()">
        Aujourd'hui
      </button>
      <button
        pButton
        type="button"
        severity="secondary"
        outlined
        aria-label="Semaine suivante"
        (click)="next.emit()"
      >
        <ion-icon name="chevron-forward-outline" aria-hidden="true"></ion-icon>
      </button>
    </div>
    <p class="week-navigator__label" aria-live="polite">{{ label() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-4);
    }
    .week-navigator__buttons {
      display: flex;
      gap: var(--ath-space-2);
    }
    .week-navigator__label {
      margin: 0;
      font-family: var(--ath-font-display);
      font-size: var(--ath-text-lead);
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
