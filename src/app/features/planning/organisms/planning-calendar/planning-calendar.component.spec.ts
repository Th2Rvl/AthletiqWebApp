import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarItem, PlanningCalendarComponent } from './planning-calendar.component';

const ITEMS: CalendarItem[] = [
  {
    key: 'ps-1',
    date: '2026-11-12',
    name: 'Haut du corps A',
    meta: '5 exercices, 15 séries',
    locked: false,
  },
  {
    key: 'ps-2',
    date: '2026-11-12',
    name: 'Gainage',
    meta: '3 exercices, 9 séries',
    locked: false,
  },
  { key: 'ps-3', date: '2026-11-03', name: 'Fractionné court', meta: null, locked: true },
];

describe('PlanningCalendarComponent', () => {
  let fixture: ComponentFixture<PlanningCalendarComponent>;
  let element: HTMLElement;

  async function render(
    inputs: Partial<{
      today: string | null;
      items: CalendarItem[];
      loading: boolean;
      canPlan: boolean;
    }> = {},
  ) {
    fixture = TestBed.createComponent(PlanningCalendarComponent);
    fixture.componentRef.setInput('start', '2026-11-05');
    fixture.componentRef.setInput(
      'today',
      inputs.today === undefined ? '2026-11-05' : inputs.today,
    );
    fixture.componentRef.setInput('items', inputs.items ?? ITEMS);
    fixture.componentRef.setInput('loading', inputs.loading ?? false);
    fixture.componentRef.setInput('canPlan', inputs.canPlan ?? true);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function cell(date: string): HTMLElement {
    const found = [...element.querySelectorAll<HTMLElement>('[role="gridcell"]')].find(
      (candidate) => candidate.getAttribute('aria-label')?.includes(date),
    );
    if (!found) {
      throw new Error(`Case « ${date} » introuvable`);
    }
    return found;
  }

  it('affiche 4 semaines du lundi au dimanche à partir du lundi de la période', async () => {
    await render();

    const cells = element.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(28);
    expect(cells[0].getAttribute('aria-label')).toBe('lundi 2 novembre 2026');
    expect(cells[27].getAttribute('aria-label')).toBe('dimanche 29 novembre 2026');
    expect(element.querySelectorAll('[role="columnheader"]')[0].textContent).toContain('Lundi');
  });

  it('empile plusieurs séances dans la même case', async () => {
    await render();

    const day = cell('jeudi 12 novembre');
    expect(day.querySelectorAll('app-planned-session-chip')).toHaveLength(2);
    expect(day.textContent).toContain('Haut du corps A');
    expect(day.textContent).toContain('Gainage');
    expect(day.textContent).toContain('5 exercices, 15 séries');
  });

  it("met en évidence aujourd'hui (donné par l'API) et ne propose pas « Planifier » les jours passés", async () => {
    await render();

    const today = cell('jeudi 5 novembre');
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(today.textContent).toContain("Aujourd'hui");
    expect(today.querySelector('button.calendar__plan')).not.toBeNull();
    expect(cell('mercredi 4 novembre').querySelector('button.calendar__plan')).toBeNull();
    expect(cell('mardi 3 novembre').textContent).toContain('Passée');
  });

  it("n'offre aucune action « Planifier » tant que l'API n'a pas donné aujourd'hui, ou si la planification est impossible", async () => {
    await render({ today: null });
    expect(element.querySelectorAll('button.calendar__plan')).toHaveLength(0);

    await render({ canPlan: false });
    expect(element.querySelectorAll('button.calendar__plan')).toHaveLength(0);
  });

  it('émet le jour à planifier et la séance à ouvrir', async () => {
    await render();
    const planned: string[] = [];
    const opened: string[] = [];
    fixture.componentInstance.plan.subscribe((date) => planned.push(date));
    fixture.componentInstance.open.subscribe((key) => opened.push(key));

    cell('mardi 17 novembre').querySelector<HTMLButtonElement>('button.calendar__plan')!.click();
    cell('jeudi 12 novembre')
      .querySelector<HTMLButtonElement>('app-planned-session-chip button')!
      .click();

    expect(planned).toEqual(['2026-11-17']);
    expect(opened).toEqual(['ps-1']);
  });

  it('se parcourt au clavier : flèches, haut et bas par semaine, Début et Fin', async () => {
    await render();
    const start = cell('jeudi 12 novembre');
    start.focus();

    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement?.getAttribute('aria-label')).toBe('vendredi 13 novembre 2026');

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(document.activeElement?.getAttribute('aria-label')).toBe('vendredi 20 novembre 2026');

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    expect(document.activeElement?.getAttribute('aria-label')).toBe('lundi 16 novembre 2026');

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    expect(document.activeElement?.getAttribute('aria-label')).toBe('dimanche 22 novembre 2026');

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    expect(document.activeElement?.getAttribute('aria-label')).toBe('dimanche 15 novembre 2026');
  });

  it('affiche des squelettes pendant le chargement, sans séance ni action', async () => {
    await render({ loading: true });

    expect(element.querySelector('[role="grid"]')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('app-planned-session-chip')).toHaveLength(0);
    expect(element.querySelectorAll('button.calendar__plan')).toHaveLength(0);
  });
});
