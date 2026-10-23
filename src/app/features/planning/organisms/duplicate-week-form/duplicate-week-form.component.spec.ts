import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DuplicateWeekPayload } from '../../../../core/api/models/api.models';
import { DuplicateWeekFormComponent, WeekOption } from './duplicate-week-form.component';

const WEEKS: WeekOption[] = [
  { weekStart: '2026-11-02', label: 'Semaine du 2 novembre 2026', sessionCount: 3 },
  { weekStart: '2026-11-09', label: 'Semaine du 9 novembre 2026', sessionCount: 0 },
];

describe('DuplicateWeekFormComponent', () => {
  let fixture: ComponentFixture<DuplicateWeekFormComponent>;
  let element: HTMLElement;
  let submitted: DuplicateWeekPayload[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(DuplicateWeekFormComponent);
    fixture.componentRef.setInput('weeks', WEEKS);
    fixture.componentRef.setInput('initialWeekStart', '2026-11-02');
    fixture.componentRef.setInput('targetLabel', 'Lucas Durand');
    submitted = [];
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  async function change(selector: string, value: unknown): Promise<void> {
    fixture.debugElement.query(By.css(selector)).triggerEventHandler('ngModelChange', value);
    await fixture.whenStable();
  }

  it('résume la copie et émet le lundi source et le nombre de semaines', async () => {
    await change('p-inputnumber', 3);

    expect(element.textContent).toContain(
      'Copie de 3 séances sur la période 9 nov. – 29 nov. 2026',
    );
    submitButton().click();
    expect(submitted).toEqual([{ weekStart: '2026-11-02', weeks: 3 }]);
  });

  it('désactive la duplication d’une semaine vide', async () => {
    await change('p-select', '2026-11-09');

    expect(element.textContent).toContain('Aucune séance à dupliquer cette semaine');
    expect(submitButton().disabled).toBe(true);
  });

  it('refuse un nombre de semaines hors de 1 à 12', async () => {
    await change('p-inputnumber', 13);

    expect(element.textContent).toContain('Entre 1 et 12 semaines');
    expect(submitButton().disabled).toBe(true);
  });
});
