import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const SIGNED = new Intl.NumberFormat('fr-FR', {
  signDisplay: 'exceptZero',
  maximumFractionDigits: 1,
});

/**
 * Écart signé entre le prévu et le réalisé (US28) : « +2 rép. », « -5 kg », « -8 % ».
 * Un écart nul s'affiche « 0 » en texte secondaire, un écart absent (charge vide, série non
 * faite) « – ». Aucune couleur de réussite ou d'échec : faire plus ou moins que le prévu
 * n'est pas bon ou mauvais en soi, c'est au coach d'en juger.
 *
 * Atome maison : PrimeNG n'a pas de composant d'affichage d'une valeur formatée.
 */
@Component({
  selector: 'app-delta-value',
  template: `
    @if (value() === null) {
      <span class="delta-value--none" aria-label="Aucun écart calculé">–</span>
    } @else {
      <span [class.delta-value--zero]="value() === 0">{{ text() }}</span>
    }
  `,
  styles: `
    :host {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .delta-value--zero,
    .delta-value--none {
      color: var(--ath-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeltaValueComponent {
  readonly value = input<number | null>(null);
  /** Unité affichée après la valeur : « rép. », « kg » ou « % ». */
  readonly unit = input.required<string>();

  protected readonly text = computed(() => {
    const value = this.value();
    return value === null ? '' : `${SIGNED.format(value)} ${this.unit()}`;
  });
}
