import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import {
  FATIGUE_MAX,
  RPE_MAX,
  fatigueLabel,
  fatigueLevel,
  rpeLabel,
  rpeLevel,
} from '../../intensity';

/** Échelle affichée : RPE de 1 à 10 ou fatigue de 1 à 5 (RM9). */
export type IntensityScale = 'rpe' | 'fatigue';

/**
 * Ressenti d'une séance sur l'échelle d'intensité commune au mobile : RPE (1 à 10) ou
 * fatigue (1 à 5), coloré par niveau avec les tokens `--ath-rpe-*`. Une valeur absente
 * s'affiche « Non renseigné », jamais 0.
 *
 * Atome maison sur `p-tag` : les sévérités de `p-tag` (succès, alerte, danger) ne portent pas
 * l'échelle à quatre niveaux du RPE. L'atome garde la forme du tag et ajoute ce que le tag ne
 * sait pas faire : le niveau d'après la valeur, le libellé lu par les lecteurs d'écran
 * (« RPE 8 sur 10, difficile ») et l'état « Non renseigné ».
 */
@Component({
  selector: 'app-intensity-badge',
  imports: [TagModule],
  template: `
    @if (value(); as current) {
      <p-tag
        class="intensity"
        [class.intensity--easy]="level() === 'easy'"
        [class.intensity--moderate]="level() === 'moderate'"
        [class.intensity--hard]="level() === 'hard'"
        [class.intensity--max]="level() === 'max'"
      >
        <span aria-hidden="true">{{ withMax() ? current + '/' + max() : current }}</span>
        <span class="visually-hidden">{{ spoken() }}</span>
      </p-tag>
      @if (showLabel()) {
        <span class="intensity-badge__label" aria-hidden="true">{{ levelLabel() }}</span>
      }
    } @else {
      <span class="intensity-badge__empty">Non renseigné</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--ath-space-2);
      font-variant-numeric: tabular-nums;
    }
    .intensity {
      min-width: 2rem;
      justify-content: center;
      font-variant-numeric: tabular-nums;
    }
    .intensity--easy {
      background: var(--ath-rpe-easy-bg);
      color: var(--ath-rpe-easy-text);
    }
    .intensity--moderate {
      background: var(--ath-rpe-moderate-bg);
      color: var(--ath-rpe-moderate-text);
    }
    .intensity--hard {
      background: var(--ath-rpe-hard-bg);
      color: var(--ath-rpe-hard-text);
    }
    .intensity--max {
      background: var(--ath-rpe-max-bg);
      color: var(--ath-rpe-max-text);
    }
    .intensity-badge__label,
    .intensity-badge__empty {
      color: var(--ath-text-muted);
      font-size: var(--ath-text-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntensityBadgeComponent {
  readonly scale = input.required<IntensityScale>();
  /** Valeur entière, `null` = non renseignée. */
  readonly value = input<number | null>(null);
  /** Affiche « 8/10 » au lieu de « 8 » (détail d'une séance). */
  readonly withMax = input(false);
  /** Affiche le niveau en clair à côté du badge (« difficile »). */
  readonly showLabel = input(false);

  protected readonly max = computed(() => (this.scale() === 'rpe' ? RPE_MAX : FATIGUE_MAX));
  protected readonly level = computed(() => {
    const value = this.value() ?? 0;
    return this.scale() === 'rpe' ? rpeLevel(value) : fatigueLevel(value);
  });
  protected readonly levelLabel = computed(() => {
    const value = this.value() ?? 0;
    return this.scale() === 'rpe' ? rpeLabel(value) : fatigueLabel(value);
  });
  protected readonly spoken = computed(() => {
    const name = this.scale() === 'rpe' ? 'RPE' : 'Fatigue';
    return `${name} ${this.value()} sur ${this.max()}, ${this.levelLabel()}`;
  });
}
