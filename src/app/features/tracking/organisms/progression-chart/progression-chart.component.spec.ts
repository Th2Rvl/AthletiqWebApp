import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { UIChart } from 'primeng/chart';
import { Progression } from '../../../../core/api/models/api.models';
import { ProgressionChartComponent } from './progression-chart.component';

const SQUAT: Progression = {
  athleteId: 'ath-1',
  exerciseId: 'ex-1',
  exerciseName: 'Squat',
  muscleGroup: 'QUADRICEPS',
  bodyweight: false,
  weeks: 12,
  from: '2026-08-13',
  today: '2026-11-05',
  points: [
    { plannedSessionId: 'ps-1', date: '2026-09-08', maxLoadKg: 72.5, maxReps: 8, volumeKg: 1740 },
    { plannedSessionId: 'ps-2', date: '2026-09-22', maxLoadKg: 75, maxReps: 6, volumeKg: 1665 },
    { plannedSessionId: 'ps-3', date: '2026-10-13', maxLoadKg: 77.5, maxReps: 6, volumeKg: 1782.5 },
  ],
};
const PULL_UPS: Progression = {
  ...SQUAT,
  exerciseId: 'ex-2',
  exerciseName: 'Tractions',
  muscleGroup: 'DOS',
  bodyweight: true,
  points: [
    { plannedSessionId: 'ps-4', date: '2026-10-20', maxLoadKg: null, maxReps: 9, volumeKg: null },
  ],
};

describe('ProgressionChartComponent', () => {
  let fixture: ComponentFixture<ProgressionChartComponent>;
  let element: HTMLElement;

  async function render(progression: Progression) {
    // jsdom ne dessine pas sur un canvas : Chart.js se contente d'un avertissement.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ProgressionChartComponent);
    fixture.componentRef.setInput('progression', progression);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function chart(): UIChart {
    return fixture.debugElement.query(By.css('p-chart')).componentInstance as UIChart;
  }

  function series(): unknown[] {
    return (chart().data() as { datasets: { data: unknown[] }[] }).datasets[0].data;
  }

  afterEach(() => vi.restoreAllMocks());

  it('trace la charge max par séance réalisée, axe date', async () => {
    await render(SQUAT);

    expect(chart().type()).toBe('line');
    expect((chart().data() as { labels: string[] }).labels).toEqual([
      '8 sept.',
      '22 sept.',
      '13 oct.',
    ]);
    expect(series()).toEqual([72.5, 75, 77.5]);
    expect(chart().ariaLabel()).toContain('Charge max de Squat par séance réalisée');
  });

  it('passe au volume au choix du coach', async () => {
    await render(SQUAT);

    fixture.debugElement
      .query(By.css('p-selectbutton'))
      .triggerEventHandler('ngModelChange', 'volume');
    await fixture.whenStable();

    expect(series()).toEqual([1740, 1665, 1782.5]);
  });

  it('reprend les mêmes valeurs dans un tableau accessible, avec un lien vers chaque séance', async () => {
    await render(SQUAT);

    const rows = [...element.querySelectorAll('tbody tr')].map((row) =>
      row.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('mar. 8 sept. 2026');
    expect(rows[0]).toContain('72,5 kg');
    expect(rows[0]).toMatch(/1\s?740 kg/);
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/athletes/ath-1/seances/ps-1',
    );
  });

  it('au poids du corps : répétitions max, sans choix de mesure', async () => {
    await render(PULL_UPS);

    expect(element.querySelector('p-selectbutton')).toBeNull();
    expect(element.textContent).toContain('Poids du corps : répétitions max par séance');
    expect(series()).toEqual([9]);
    const headers = [...element.querySelectorAll('th')].map((th) => th.textContent!.trim());
    expect(headers).toEqual(['Date', 'Répétitions max']);
  });

  it('un seul point : affiché, avec « Pas encore assez de données pour une progression »', async () => {
    await render(PULL_UPS);

    expect(element.textContent).toContain('Pas encore assez de données pour une progression');
    expect(element.querySelector('p-chart')).not.toBeNull();
  });

  it('signale un exercice non réalisé sur la période choisie', async () => {
    await render({ ...SQUAT, weeks: 4, points: [] });

    expect(element.textContent).toContain(
      'Aucune séance réalisée de cet exercice sur les 4 dernières semaines',
    );
    expect(element.querySelector('p-chart')).toBeNull();
  });
});
