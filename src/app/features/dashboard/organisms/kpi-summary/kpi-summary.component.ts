import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IsoDate, KpiTotals } from '../../../../core/api/models/api.models';
import { periodLabel } from '../../../planning/planning-dates';
import { formatRate, formatRpe } from '../../kpi-format';

/**
 * En-tête chiffré du tableau de bord (US32), hiérarchisé (skill front-look §5) : le taux de
 * réalisation en indicateur principal, avec sa période ; en appui, réalisées, non faites,
 * RPE moyen et nombre d'athlètes. Pas de rangée de cartes de même poids.
 * Sans séance passée sur la période, le taux s'affiche « – » avec la raison.
 */
@Component({
  selector: 'app-kpi-summary',
  template: `
    <div class="kpi__main">
      <span class="kpi__label">Taux de réalisation</span>
      <span class="kpi__rate">{{ rate() }}</span>
      <span class="kpi__context">
        {{ weeks() }} dernières semaines, {{ period() }}, aujourd'hui exclu
      </span>
      @if (noPastSession()) {
        <span class="kpi__context">Pas encore de séance passée sur cette période</span>
      }
    </div>
    <dl class="kpi__support">
      <div class="kpi__item">
        <dt>Réalisées</dt>
        <dd>{{ totals().doneCount }}</dd>
      </div>
      <div class="kpi__item">
        <dt>Non faites</dt>
        <dd [class.kpi__value--alert]="totals().missedCount > 0">{{ totals().missedCount }}</dd>
      </div>
      <div class="kpi__item">
        <dt>RPE moyen</dt>
        <dd>{{ rpe() }}</dd>
      </div>
      <div class="kpi__item">
        <dt>Athlètes suivis</dt>
        <dd>{{ totals().athleteCount }}</dd>
      </div>
    </dl>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--ath-space-5) var(--ath-space-7);
      padding: var(--ath-space-5) var(--ath-space-6);
      border-radius: var(--ath-radius-md);
      background: var(--ath-surface);
      font-variant-numeric: tabular-nums;
    }
    .kpi__main {
      display: flex;
      flex-direction: column;
      gap: var(--ath-space-1);
    }
    .kpi__label,
    .kpi__context,
    dt {
      color: var(--ath-text-muted);
      font-size: var(--ath-text-small);
    }
    .kpi__label,
    dt {
      font-weight: var(--ath-weight-medium);
    }
    .kpi__rate {
      font-family: var(--ath-font-display);
      font-size: var(--ath-text-kpi-1);
      font-weight: var(--ath-weight-extrabold);
      line-height: var(--ath-line-height-tight);
      letter-spacing: var(--ath-tracking-tight);
    }
    .kpi__support {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ath-space-4) var(--ath-space-6);
      margin: 0;
    }
    .kpi__item {
      display: flex;
      flex-direction: column;
      gap: var(--ath-space-1);
    }
    dd {
      margin: 0;
      font-family: var(--ath-font-display);
      font-size: var(--ath-text-kpi-3);
      font-weight: var(--ath-weight-bold);
      line-height: var(--ath-line-height-tight);
    }
    .kpi__value--alert {
      color: var(--ath-danger-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiSummaryComponent {
  readonly totals = input.required<KpiTotals>();
  readonly weeks = input.required<number>();
  readonly from = input.required<IsoDate>();
  readonly to = input.required<IsoDate>();

  protected readonly rate = computed(() => formatRate(this.totals().completionRate));
  protected readonly rpe = computed(() => formatRpe(this.totals().averageRpe));
  protected readonly period = computed(() => periodLabel(this.from(), this.to()));
  protected readonly noPastSession = computed(
    () => this.totals().doneCount + this.totals().missedCount === 0,
  );
}
