import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SessionHistoryItem } from '../../../../core/api/models/api.models';
import { HistoryFilters, SessionHistoryTableComponent } from './session-history-table.component';

const DONE: SessionHistoryItem = {
  plannedSessionId: 'ps-3',
  date: '2026-11-03',
  name: 'Haut du corps A',
  status: 'DONE',
  rpe: 8,
  fatigue: 4,
  hasComment: true,
  validatedAt: '2026-11-03T18:42:00Z',
  correctedAt: null,
};
const DONE_WITHOUT_FEEDBACK: SessionHistoryItem = {
  ...DONE,
  plannedSessionId: 'ps-2',
  date: '2026-10-30',
  name: 'Gainage',
  rpe: null,
  fatigue: null,
  hasComment: false,
};
const MISSED: SessionHistoryItem = {
  plannedSessionId: 'ps-1',
  date: '2026-10-27',
  name: 'Fractionné court',
  status: 'MISSED',
  rpe: null,
  fatigue: null,
  hasComment: false,
  validatedAt: null,
  correctedAt: null,
};
const FILTERS: HistoryFilters = { status: null, withComment: false, weeks: 4 };

describe('SessionHistoryTableComponent', () => {
  let fixture: ComponentFixture<SessionHistoryTableComponent>;
  let element: HTMLElement;
  let emitted: HistoryFilters[];

  async function render(sessions: SessionHistoryItem[], filters = FILTERS) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(SessionHistoryTableComponent);
    fixture.componentRef.setInput('athleteId', 'ath-1');
    fixture.componentRef.setInput('sessions', sessions);
    fixture.componentRef.setInput('totalRecords', sessions.length);
    fixture.componentRef.setInput('filters', filters);
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((value) => emitted.push(value));
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function rows(): HTMLTableRowElement[] {
    return [...element.querySelectorAll<HTMLTableRowElement>('tbody tr')];
  }

  it('affiche date, nom, statut, RPE, fatigue et commentaire, dans l’ordre reçu', async () => {
    await render([DONE, DONE_WITHOUT_FEEDBACK, MISSED]);

    const [first, second, third] = rows();
    expect(first.textContent).toContain('mar. 3 nov. 2026');
    expect(first.textContent).toContain('Haut du corps A');
    expect(first.textContent).toContain('Réalisée');
    expect(first.textContent).toContain('RPE 8 sur 10, difficile');
    expect(first.textContent).toContain('Fatigue 4 sur 5, élevée');
    expect(first.querySelector('ion-icon[name="chatbubble-outline"]')).not.toBeNull();
    expect(second.textContent).toContain('Non renseigné');
    expect(third.textContent).toContain('Non faite');
    expect(third.textContent).not.toContain('Non renseigné');
  });

  it('mène chaque séance à son prévu / réalisé', async () => {
    await render([DONE]);

    const link = rows()[0].querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/athletes/ath-1/seances/ps-3');
  });

  it('remonte chaque filtre à la page : statut, « Avec commentaire », période', async () => {
    await render([DONE]);

    fixture.debugElement
      .query(By.css('p-select'))
      .triggerEventHandler('onChange', { value: 'MISSED' });
    fixture.debugElement.query(By.css('p-checkbox')).triggerEventHandler('ngModelChange', true);
    fixture.debugElement.query(By.css('app-period-picker')).triggerEventHandler('weeksChange', 12);

    expect(emitted).toEqual([
      { status: 'MISSED', withComment: false, weeks: 4 },
      { status: null, withComment: true, weeks: 4 },
      { status: null, withComment: false, weeks: 12 },
    ]);
  });

  it('signale une période sans séance, ou des filtres sans résultat', async () => {
    await render([]);
    expect(element.textContent).toContain('Aucune séance passée sur les 4 dernières semaines');

    fixture.componentRef.setInput('filters', { ...FILTERS, withComment: true });
    await fixture.whenStable();
    expect(element.textContent).toContain('Aucune séance ne correspond à ces filtres');
  });

  it('affiche des squelettes avant le premier chargement', async () => {
    await render([]);
    fixture.componentRef.setInput('loaded', false);
    await fixture.whenStable();

    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('Aucune séance');
  });
});
