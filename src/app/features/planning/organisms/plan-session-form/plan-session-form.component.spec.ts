import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PlanSessionPayload } from '../../../../core/api/models/api.models';
import { PlanSessionFormComponent, WorkoutOption } from './plan-session-form.component';

const WORKOUTS: WorkoutOption[] = [
  { id: 'w-1', name: 'Haut du corps A' },
  { id: 'w-2', name: 'Fractionné court' },
];

describe('PlanSessionFormComponent', () => {
  let fixture: ComponentFixture<PlanSessionFormComponent>;
  let element: HTMLElement;
  let submitted: PlanSessionPayload[];

  async function render(workouts: WorkoutOption[] = WORKOUTS, extra: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(PlanSessionFormComponent);
    fixture.componentRef.setInput('date', '2026-11-12');
    fixture.componentRef.setInput('today', '2026-11-05');
    fixture.componentRef.setInput('targetLabel', 'Lucas Durand');
    fixture.componentRef.setInput('workouts', workouts);
    for (const [name, value] of Object.entries(extra)) {
      fixture.componentRef.setInput(name, value);
    }
    submitted = [];
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  async function choose(selector: string, value: unknown): Promise<void> {
    fixture.debugElement.query(By.css(selector)).triggerEventHandler('ngModelChange', value);
    await fixture.whenStable();
  }

  it('rappelle la cible et le jour, et bloque la validation tant qu’aucune séance n’est choisie', async () => {
    await render();

    expect(element.textContent).toContain('Lucas Durand, jeudi 12 novembre 2026');
    expect(submitButton().disabled).toBe(true);
  });

  it('émet la séance et le jour en AAAA-MM-JJ', async () => {
    await render();

    await choose('p-select', 'w-1');
    expect(submitButton().disabled).toBe(false);
    submitButton().click();
    await fixture.whenStable();

    expect(submitted).toEqual([{ workoutId: 'w-1', date: '2026-11-12' }]);
  });

  it('lit le jour choisi dans le sélecteur sans décalage, et refuse un jour passé', async () => {
    await render();
    await choose('p-select', 'w-2');

    await choose('p-datepicker', new Date(2026, 10, 19));
    submitButton().click();
    expect(submitted).toEqual([{ workoutId: 'w-2', date: '2026-11-19' }]);

    await choose('p-datepicker', new Date(2026, 10, 4));
    expect(element.textContent).toContain("Choisissez aujourd'hui ou un jour à venir");
    expect(submitButton().disabled).toBe(true);
  });

  it("affiche l'erreur de l'API sous le champ date, et l'efface quand on change de jour", async () => {
    await render(WORKOUTS, { serverErrors: { date: 'Impossible de planifier à une date passée' } });

    expect(element.textContent).toContain('Impossible de planifier à une date passée');
    await choose('p-datepicker', new Date(2026, 10, 20));
    expect(element.textContent).not.toContain('Impossible de planifier à une date passée');
  });

  it('coach sans séance : « Créez d’abord une séance » avec un lien vers les séances, sans validation', async () => {
    await render([]);
    let goToWorkouts = 0;
    fixture.componentInstance.createWorkout.subscribe(() => goToWorkouts++);

    expect(element.textContent).toContain("Créez d'abord une séance");
    expect(submitButton()).toBeNull();
    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Aller aux séances'))!
      .click();
    expect(goToWorkouts).toBe(1);
  });
});
