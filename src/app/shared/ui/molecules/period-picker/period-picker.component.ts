import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';

let nextId = 0;

/**
 * Choix d'une période glissante en semaines (« 4 sem. », « 12 sem. »…) : libellé visible et
 * `p-selectbutton`, sans valeur vide. Sert à l'historique et à la progression d'un athlète
 * comme au tableau de bord ; chaque écran donne ses propres durées (contrat #7).
 */
@Component({
  selector: 'app-period-picker',
  imports: [FormsModule, SelectButtonModule],
  template: `
    <span class="period-picker__label" [id]="labelId">{{ label() }}</span>
    <p-selectbutton
      [options]="options()"
      optionLabel="label"
      optionValue="value"
      [allowEmpty]="false"
      size="small"
      [ngModel]="weeks()"
      (ngModelChange)="weeksChange.emit($event)"
      [ariaLabelledBy]="labelId"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-2);
    }
    .period-picker__label {
      color: var(--ath-text-muted);
      font-size: var(--ath-text-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodPickerComponent {
  /** Durées proposées, en semaines. */
  readonly choices = input.required<number[]>();
  readonly weeks = input.required<number>();
  readonly label = input('Période');

  readonly weeksChange = output<number>();

  protected readonly labelId = `period-picker-${nextId++}`;
  protected readonly options = computed(() =>
    this.choices().map((value) => ({ value, label: `${value} sem.` })),
  );
}
