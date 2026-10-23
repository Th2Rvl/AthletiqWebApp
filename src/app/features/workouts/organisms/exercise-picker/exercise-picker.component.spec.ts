import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Exercise, ExerciseRef } from '../../../../core/api/models/api.models';
import { ExercisePickerComponent } from './exercise-picker.component';

function exercise(id: string, name: string, muscleGroup: Exercise['muscleGroup']): Exercise {
  return {
    id,
    name,
    description: null,
    muscleGroup,
    equipment: null,
    videoUrl: null,
    createdAt: '2026-10-20T08:00:00.000000Z',
    updatedAt: '2026-10-20T08:00:00.000000Z',
  };
}

const SQUAT = exercise('ex-1', 'Squat arrière', 'QUADRICEPS');
const TIRAGE = exercise('ex-2', 'Tirage horizontal', 'DOS');
const DIPS = exercise('ex-3', 'Dips', 'TRICEPS');

describe('ExercisePickerComponent', () => {
  let fixture: ComponentFixture<ExercisePickerComponent>;
  let element: HTMLElement;
  let picked: ExerciseRef[][];

  async function setup(exercises: Exercise[], remaining = 30): Promise<void> {
    fixture = TestBed.createComponent(ExercisePickerComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('exercises', exercises);
    fixture.componentRef.setInput('totalRecords', exercises.length);
    fixture.componentRef.setInput('loaded', true);
    fixture.componentRef.setInput('remaining', remaining);
    picked = [];
    fixture.componentInstance.picked.subscribe((refs) => picked.push(refs));
    await fixture.whenStable();
  }

  function select(ids: string[]): void {
    (fixture.componentInstance as unknown as { onSelection(ids: string[]): void }).onSelection(ids);
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  it('liste les exercices de la bibliothèque avec leur groupe musculaire', async () => {
    await setup([SQUAT, TIRAGE]);

    expect(element.textContent).toContain('Squat arrière');
    expect(element.textContent).toContain('Quadriceps');
    expect(submitButton().disabled).toBe(true);
  });

  it('ajoute les exercices dans l’ordre où ils ont été cochés, même après une recherche', async () => {
    await setup([SQUAT, TIRAGE]);
    select(['ex-2']);
    fixture.componentRef.setInput('exercises', [DIPS]);
    await fixture.whenStable();
    select(['ex-2', 'ex-3']);
    await fixture.whenStable();

    expect(submitButton().textContent).toContain('Ajouter 2 exercices');
    submitButton().click();

    expect(picked).toEqual([
      [
        { id: 'ex-2', name: 'Tirage horizontal', muscleGroup: 'DOS' },
        { id: 'ex-3', name: 'Dips', muscleGroup: 'TRICEPS' },
      ],
    ]);
  });

  it('refuse de dépasser 30 exercices dans la séance', async () => {
    await setup([SQUAT, TIRAGE], 1);
    select(['ex-1', 'ex-2']);
    await fixture.whenStable();

    expect(element.textContent).toContain('La séance peut encore recevoir 1 exercice');
    expect(submitButton().disabled).toBe(true);
  });

  it('affiche l’erreur de chargement avec « Réessayer »', async () => {
    await setup([]);
    fixture.componentRef.setInput('errorMessage', 'Le serveur ne répond pas.');
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    await fixture.whenStable();

    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Réessayer'))!.click();
    expect(retry).toHaveBeenCalled();
  });
});
