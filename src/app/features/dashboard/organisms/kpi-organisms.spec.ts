import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AthleteKpi, KpiTotals, WatchlistEntry } from '../../../core/api/models/api.models';
import { AthleteKpiTableComponent } from './athlete-kpi-table/athlete-kpi-table.component';
import { KpiSummaryComponent } from './kpi-summary/kpi-summary.component';
import { WatchlistTableComponent } from './watchlist-table/watchlist-table.component';

const TOTALS: KpiTotals = {
  athleteCount: 6,
  doneCount: 31,
  missedCount: 7,
  completionRate: 82,
  averageRpe: 7.2,
};

function text(element: Element): string {
  return element.textContent!.replace(/\s+/g, ' ').trim();
}

/** Cellules d'une ligne, dans l'ordre des colonnes. */
function cells(row: Element): string[] {
  return [...row.querySelectorAll('td')].map(text);
}

/** Paires libellé / valeur des indicateurs d'appui : « Réalisées » → « 31 ». */
function support(element: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    [...element.querySelectorAll('.kpi__item')].map((item) => [
      text(item.querySelector('dt')!),
      text(item.querySelector('dd')!),
    ]),
  );
}

describe('KpiSummaryComponent', () => {
  async function render(totals: KpiTotals): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(KpiSummaryComponent);
    fixture.componentRef.setInput('totals', totals);
    fixture.componentRef.setInput('weeks', 4);
    fixture.componentRef.setInput('from', '2026-10-08');
    fixture.componentRef.setInput('to', '2026-11-04');
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('met le taux de réalisation en avant, avec sa période, et les autres agrégats en appui', async () => {
    const element = await render(TOTALS);

    expect(text(element.querySelector('.kpi__rate')!)).toBe('82 %');
    expect(text(element)).toContain('4 dernières semaines, 8 oct. – 4 nov. 2026');
    expect(support(element)).toEqual({
      Réalisées: '31',
      'Non faites': '7',
      'RPE moyen': '7,2',
      'Athlètes suivis': '6',
    });
  });

  it('sans séance passée : taux et RPE « – », jamais 0 %', async () => {
    const element = await render({
      athleteCount: 2,
      doneCount: 0,
      missedCount: 0,
      completionRate: null,
      averageRpe: null,
    });

    expect(text(element.querySelector('.kpi__rate')!)).toBe('–');
    expect(text(element)).toContain('Pas encore de séance passée sur cette période');
    expect(support(element)['RPE moyen']).toBe('–');
    expect(text(element)).not.toContain('0 %');
  });
});

describe('WatchlistTableComponent', () => {
  const ENTRIES: WatchlistEntry[] = [
    {
      athleteId: 'ath-2',
      firstName: 'Inès',
      lastName: 'Moreau',
      missedCount: 4,
      missedLast7Days: 2,
      completionRate: 56,
      reasons: ['MISSED_RECENTLY', 'LOW_COMPLETION'],
    },
    {
      athleteId: 'ath-3',
      firstName: 'Karim',
      lastName: 'Benali',
      missedCount: 1,
      missedLast7Days: 1,
      completionRate: 88,
      reasons: ['MISSED_RECENTLY'],
    },
  ];

  async function render(entries: WatchlistEntry[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(WatchlistTableComponent);
    fixture.componentRef.setInput('entries', entries);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it("liste les athlètes à surveiller dans l'ordre de l'API, avec motifs et lien vers le suivi", async () => {
    const element = await render(ENTRIES);

    const rows = [...element.querySelectorAll('tbody tr')];
    expect(cells(rows[0])).toEqual([
      'Moreau Inès',
      expect.stringMatching(/^2 non faites ces 7 derniers jours\s?Taux de réalisation bas$/),
      '4',
      '56 %',
    ]);
    expect(cells(rows[1])).toEqual(['Benali Karim', 'Non faite ces 7 derniers jours', '1', '88 %']);
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/athletes/ath-2/suivi');
  });

  it('dit qu’aucun athlète n’est à surveiller', async () => {
    const element = await render([]);

    expect(text(element)).toBe('Aucun athlète à surveiller sur cette période.');
  });
});

describe('AthleteKpiTableComponent', () => {
  it('affiche les indicateurs de chaque athlète, « – » sans séance passée, et « À surveiller »', async () => {
    const athletes: AthleteKpi[] = [
      {
        athleteId: 'ath-3',
        firstName: 'Karim',
        lastName: 'Benali',
        doneCount: 7,
        missedCount: 1,
        completionRate: 88,
        averageRpe: 6.8,
        missedLast7Days: 1,
        watch: true,
      },
      {
        athleteId: 'ath-5',
        firstName: 'Chloé',
        lastName: 'Petit',
        doneCount: 0,
        missedCount: 0,
        completionRate: null,
        averageRpe: null,
        missedLast7Days: 0,
        watch: false,
      },
    ];
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AthleteKpiTableComponent);
    fixture.componentRef.setInput('athletes', athletes);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    const rows = [...element.querySelectorAll('tbody tr')];
    expect(cells(rows[0])).toEqual(['Benali Karim', '88 %', '7', '1', '1', '6,8', 'À surveiller']);
    expect(cells(rows[1])).toEqual(['Petit Chloé', '–', '0', '0', '0', '–', '']);
    expect(rows[1].querySelector('a')?.getAttribute('href')).toBe('/athletes/ath-5/suivi');
  });
});
