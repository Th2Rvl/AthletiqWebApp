import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewedExercise, SessionStatus } from '../../../../core/api/models/api.models';
import { PlannedVsPerformedComponent } from './planned-vs-performed.component';

const SQUAT: ReviewedExercise = {
  snapshotExerciseId: 'se-1',
  exerciseId: 'ex-1',
  exerciseName: 'Squat',
  muscleGroup: 'QUADRICEPS',
  position: 0,
  note: 'Descente contrôlée',
  bodyweight: false,
  plannedVolumeKg: 1290,
  performedVolumeKg: 1047.5,
  volumeDeltaPercent: -19,
  sets: [
    {
      snapshotSetId: 'ss-1',
      position: 0,
      plannedReps: 8,
      plannedLoadKg: 72.5,
      restSeconds: 120,
      done: true,
      performedReps: 10,
      performedLoadKg: 67.5,
      repsDelta: 2,
      loadDeltaKg: -5,
    },
    {
      snapshotSetId: 'ss-2',
      position: 1,
      plannedReps: 8,
      plannedLoadKg: 72.5,
      restSeconds: 120,
      done: true,
      performedReps: 5,
      performedLoadKg: 72.5,
      repsDelta: -3,
      loadDeltaKg: 0,
    },
    {
      snapshotSetId: 'ss-3',
      position: 2,
      plannedReps: 6,
      plannedLoadKg: 77.5,
      restSeconds: 150,
      done: false,
      performedReps: null,
      performedLoadKg: null,
      repsDelta: null,
      loadDeltaKg: null,
    },
  ],
};
const PULL_UPS: ReviewedExercise = {
  snapshotExerciseId: 'se-2',
  exerciseId: 'ex-2',
  exerciseName: 'Tractions',
  muscleGroup: 'DOS',
  position: 1,
  note: null,
  bodyweight: true,
  plannedVolumeKg: null,
  performedVolumeKg: null,
  volumeDeltaPercent: null,
  sets: [
    {
      snapshotSetId: 'ss-4',
      position: 0,
      plannedReps: 7,
      plannedLoadKg: null,
      restSeconds: 90,
      done: true,
      performedReps: 9,
      performedLoadKg: null,
      repsDelta: 2,
      loadDeltaKg: null,
    },
  ],
};

describe('PlannedVsPerformedComponent', () => {
  let fixture: ComponentFixture<PlannedVsPerformedComponent>;
  let element: HTMLElement;

  async function render(status: SessionStatus, exercises = [SQUAT, PULL_UPS]) {
    fixture = TestBed.createComponent(PlannedVsPerformedComponent);
    fixture.componentRef.setInput('exercises', exercises);
    fixture.componentRef.setInput('status', status);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function exercise(name: string): HTMLElement {
    return [...element.querySelectorAll<HTMLElement>('li.pvp__exercise')].find((item) =>
      item.querySelector('h3')?.textContent?.includes(name),
    )!;
  }

  function rowsOf(item: HTMLElement): string[] {
    return [...item.querySelectorAll('tbody tr')].map((row) =>
      row.textContent!.replace(/\s+/g, ' ').trim(),
    );
  }

  it('séance réalisée : prévu et réalisé par série, écarts signés en répétitions et en charge', async () => {
    await render('DONE');

    const squat = exercise('Squat');
    expect(squat.textContent).toContain('Quadriceps');
    expect(squat.textContent).toContain('Descente contrôlée');
    const [first, second] = rowsOf(squat);
    expect(first).toContain('8 × 72,5 kg');
    expect(first).toContain('10 × 67,5 kg');
    expect(first).toContain('+2 rép.');
    expect(first).toContain('-5 kg');
    expect(second).toContain('-3 rép.');
    expect(second).toContain('0 kg');
  });

  it('une série non faite affiche « Non faite », sans écart', async () => {
    await render('DONE');

    const third = rowsOf(exercise('Squat'))[2];
    expect(third).toContain('6 × 77,5 kg');
    expect(third).toContain('Non faite');
    expect(third).not.toContain('rép.');
  });

  it("donne le volume prévu, réalisé et l'écart en % de chaque exercice chargé", async () => {
    await render('DONE');

    const volume = exercise('Squat')
      .querySelector('.pvp__volume')!
      .textContent!.replace(/\s+/g, ' ');
    expect(volume).toMatch(/Volume prévu 1\s?290 kg/);
    expect(volume).toMatch(/réalisé 1\s?047,5 kg/);
    expect(volume).toContain('-19 %');
  });

  it('au poids du corps : ni volume ni colonne d’écart de charge, comparaison sur les répétitions', async () => {
    await render('DONE');

    const pullUps = exercise('Tractions');
    expect(pullUps.textContent).toContain('Poids du corps : comparaison sur les répétitions');
    const headers = [...pullUps.querySelectorAll('th')].map((th) => th.textContent!.trim());
    expect(headers).toEqual(['Série', 'Prévu', 'Réalisé', 'Écart rép.']);
    expect(rowsOf(pullUps)[0]).toContain('7 rép.');
    expect(rowsOf(pullUps)[0]).toContain('+2 rép.');
  });

  it('séance non faite ou à venir : le prévu seul, sans colonne du réalisé', async () => {
    await render('MISSED');

    const headers = [...exercise('Squat').querySelectorAll('th')].map((th) =>
      th.textContent!.trim(),
    );
    expect(headers).toEqual(['Série', 'Prévu']);
    expect(element.querySelector('.pvp__volume')).toBeNull();
    expect(element.textContent).not.toContain('Non faite');
  });
});
