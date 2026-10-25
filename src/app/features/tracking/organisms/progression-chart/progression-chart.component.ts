import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ChartData, ChartOptions } from 'chart.js';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Progression, ProgressionPoint } from '../../../../core/api/models/api.models';
import { formatDay } from '../../../planning/planning-dates';
import { formatKg, shortDay } from '../../tracking-format';

/** Mesure tracée : charge max ou volume ; au poids du corps, répétitions max (Q8). */
export type ProgressionMetric = 'load' | 'volume' | 'reps';

const METRICS: Record<ProgressionMetric, { label: string; unit: string }> = {
  load: { label: 'Charge max', unit: 'kg' },
  volume: { label: 'Volume', unit: 'kg' },
  reps: { label: 'Répétitions max', unit: 'rép.' },
};

const NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/**
 * Progression d'un exercice (US30) : une courbe avec un point par séance réalisée (axe date),
 * charge max ou volume au choix ; au poids du corps, répétitions max. Les mêmes valeurs sont
 * reprises dans un tableau sous la courbe, lisible au clavier et par les lecteurs d'écran.
 * Un seul point : il est tracé, avec « Pas encore assez de données pour une progression ».
 *
 * `p-chart` (Chart.js) dessine sur un canvas, qui ne lit pas les variables CSS : les couleurs
 * et polices des tokens `--ath-*` sont lues sur la racine du document et relues quand la page
 * signale un changement de thème (`dark`).
 */
@Component({
  selector: 'app-progression-chart',
  imports: [FormsModule, RouterLink, ChartModule, SelectButtonModule, TableModule],
  templateUrl: './progression-chart.component.html',
  styleUrl: './progression-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressionChartComponent {
  private readonly document = inject(DOCUMENT);

  readonly progression = input.required<Progression>();
  /** Thème sombre actif : les couleurs du graphique sont relues à chaque changement. */
  readonly dark = input(false);

  protected readonly metricOptions = [
    { value: 'load', label: METRICS.load.label },
    { value: 'volume', label: METRICS.volume.label },
  ];
  /** Mesure choisie ; revient à la charge max quand l'exercice change. */
  protected readonly chosenMetric = linkedSignal<Progression, ProgressionMetric>({
    source: this.progression,
    computation: (_progression, previous) => previous?.value ?? 'load',
  });
  protected readonly metric = computed<ProgressionMetric>(() =>
    this.progression().bodyweight ? 'reps' : this.chosenMetric(),
  );
  protected readonly metricLabel = computed(() => METRICS[this.metric()].label);
  protected readonly points = computed(() => this.progression().points);
  protected readonly singlePoint = computed(() => this.points().length === 1);

  protected readonly chartLabel = computed(() => {
    const points = this.points();
    const { exerciseName } = this.progression();
    if (points.length === 0) {
      return '';
    }
    const first = shortDay(points[0].date);
    const last = shortDay(points[points.length - 1].date);
    const range = points.length === 1 ? `le ${first}` : `du ${first} au ${last}`;
    return `${this.metricLabel()} de ${exerciseName} par séance réalisée, ${range}. Valeurs détaillées dans le tableau qui suit.`;
  });

  protected readonly chartData = computed<ChartData<'line', (number | null)[], string>>(() => {
    const colors = this.colors();
    const metric = this.metric();
    return {
      labels: this.points().map((point) =>
        formatDay(point.date, { day: 'numeric', month: 'short' }),
      ),
      datasets: [
        {
          label: `${METRICS[metric].label} (${METRICS[metric].unit})`,
          data: this.points().map((point) => valueOf(point, metric)),
          borderColor: colors.primary,
          backgroundColor: colors.primary,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          tension: 0,
          spanGaps: true,
        },
      ],
    };
  });

  protected readonly chartOptions = computed<ChartOptions<'line'>>(() => {
    const colors = this.colors();
    const unit = METRICS[this.metric()].unit;
    const font = { family: colors.font, size: 12 };
    return {
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${NUMBER.format(context.parsed.y ?? 0)} ${unit}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: colors.line },
          ticks: { color: colors.muted, font },
        },
        y: {
          grid: { color: colors.line },
          border: { display: false },
          ticks: {
            color: colors.muted,
            font,
            precision: 0,
            callback: (value) => `${NUMBER.format(Number(value))} ${unit}`,
          },
        },
      },
    };
  });

  protected readonly shortDay = shortDay;
  protected readonly formatKg = formatKg;

  protected setMetric(metric: ProgressionMetric | null): void {
    if (metric) {
      this.chosenMetric.set(metric);
    }
  }

  /** Couleurs et police des tokens, relues quand le thème change. */
  private readonly colors = computed(() => {
    this.dark();
    const style = this.document.defaultView?.getComputedStyle(this.document.documentElement);
    const token = (name: string) => style?.getPropertyValue(name).trim() ?? '';
    return {
      primary: token('--ath-primary'),
      line: token('--ath-line'),
      muted: token('--ath-text-muted'),
      font: token('--ath-font-text'),
    };
  });
}

function valueOf(point: ProgressionPoint, metric: ProgressionMetric): number | null {
  switch (metric) {
    case 'load':
      return point.maxLoadKg;
    case 'volume':
      return point.volumeKg;
    default:
      return point.maxReps;
  }
}
