import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PersonalRecord } from '../../../../core/api/models/api.models';
import { PersonalRecordsTableComponent } from './personal-records-table.component';

const RECORDS: PersonalRecord[] = [
  {
    exerciseId: 'ex-1',
    exerciseName: 'Développé couché',
    muscleGroup: 'PECTORAUX',
    bodyweight: false,
    loadKg: 67.5,
    reps: 5,
    date: '2026-10-13',
    plannedSessionId: 'ps-3',
  },
  {
    exerciseId: 'ex-2',
    exerciseName: 'Tractions',
    muscleGroup: 'DOS',
    bodyweight: true,
    loadKg: null,
    reps: 11,
    date: '2026-09-29',
    plannedSessionId: 'ps-2',
  },
];

async function render(records: PersonalRecord[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PersonalRecordsTableComponent);
  fixture.componentRef.setInput('athleteId', 'ath-1');
  fixture.componentRef.setInput('records', records);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('PersonalRecordsTableComponent', () => {
  it("affiche par exercice la meilleure charge, les répétitions de cette série et la date, dans l'ordre de l'API", async () => {
    const element = await render(RECORDS);

    const rows = [...element.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent!.replace(/\s+/g, ' ').trim()),
    );
    expect(rows[0]).toEqual(['Pectoraux', 'Développé couché', '67,5 kg', '5', 'mar. 13 oct. 2026']);
    expect(rows[1]).toEqual(['Dos', 'Tractions', 'Poids du corps', '11', 'mar. 29 sept. 2026']);
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/athletes/ath-1/seances/ps-3',
    );
  });

  it('affiche « Aucun record pour l’instant » sans record', async () => {
    const element = await render([]);

    expect(element.textContent).toContain("Aucun record pour l'instant");
    expect(element.querySelector('p-table')).toBeNull();
  });
});
