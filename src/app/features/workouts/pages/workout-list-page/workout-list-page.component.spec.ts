import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Page, Workout, WorkoutSummary } from '../../../../core/api/models/api.models';
import { WorkoutApiService } from '../../../../core/api/workout-api.service';
import { WorkoutListPageComponent } from './workout-list-page.component';

const HAUT: WorkoutSummary = {
  id: 'w-1',
  name: 'Haut du corps A',
  description: 'Force, cycle d’automne',
  exerciseCount: 5,
  muscleGroups: ['PECTORAUX', 'DOS', 'TRICEPS'],
  createdAt: '2026-10-19T07:12:00.000000Z',
  updatedAt: '2026-10-22T17:48:00.000000Z',
};
const BAS: WorkoutSummary = {
  ...HAUT,
  id: 'w-2',
  name: 'Bas du corps B',
  description: null,
  exerciseCount: 4,
  muscleGroups: ['QUADRICEPS', 'ISCHIO_JAMBIERS'],
};
const COPY: Workout = {
  id: 'w-3',
  name: 'Haut du corps A (copie)',
  description: null,
  exercises: [],
  createdAt: '2026-10-23T09:00:00.000000Z',
  updatedAt: '2026-10-23T09:00:00.000000Z',
};

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, code: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, error: { status, code, detail: 'x' } }),
  );
}

describe('WorkoutListPageComponent', () => {
  let fixture: ComponentFixture<WorkoutListPageComponent>;
  let element: HTMLElement;
  let api: {
    list: ReturnType<typeof vi.fn>;
    duplicate: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let messages: MessageService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let confirmations: Confirmation[];

  async function setup(firstPage: Observable<Page<WorkoutSummary>>): Promise<void> {
    api = { list: vi.fn().mockReturnValue(firstPage), duplicate: vi.fn(), delete: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: WorkoutApiService, useValue: api },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });
    fixture = TestBed.createComponent(WorkoutListPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function button(label: string): HTMLButtonElement {
    const found = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label,
    );
    if (!found) {
      throw new Error(`Bouton « ${label} » introuvable`);
    }
    return found;
  }

  async function search(text: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();
  }

  it('affiche les séances : nom, nombre d’exercices, groupes musculaires', async () => {
    await setup(of(pageOf([HAUT, BAS])));

    expect(api.list).toHaveBeenCalledWith({ page: 0, size: 20, q: '' });
    expect(element.textContent).toContain('Haut du corps A');
    expect(element.textContent).toContain('Pectoraux');
    expect(element.textContent).toContain('Ischio-jambiers');
    expect(element.textContent).toContain('Bas du corps B');
  });

  it("affiche l'état vide avec « Créer une séance »", async () => {
    await setup(of(pageOf([])));

    expect(element.textContent).toContain("Aucune séance pour l'instant");
    button('Créer une séance').click();
    expect(navigate).toHaveBeenCalledWith(['/seances', 'nouvelle']);
  });

  it('distingue une recherche sans résultat de l’absence de séance', async () => {
    await setup(of(pageOf([HAUT])));
    api.list.mockReturnValue(of(pageOf([])));

    await search('jambes');

    expect(api.list).toHaveBeenLastCalledWith({ page: 0, size: 20, q: 'jambes' });
    expect(element.textContent).toContain('Aucune séance ne correspond à la recherche');
    expect(element.textContent).not.toContain("Aucune séance pour l'instant");
  });

  it('affiche des squelettes pendant le chargement', async () => {
    await setup(new Subject<Page<WorkoutSummary>>());

    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain("Aucune séance pour l'instant");
  });

  it('affiche une erreur avec « Réessayer »', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.list.mockReturnValue(of(pageOf([HAUT])));
    button('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Haut du corps A');
  });

  it("ouvre l'éditeur d'une séance avec « Modifier »", async () => {
    await setup(of(pageOf([HAUT])));

    button('Modifier Haut du corps A').click();

    expect(navigate).toHaveBeenCalledWith(['/seances', 'w-1']);
  });

  it("duplique puis ouvre l'éditeur de la copie", async () => {
    await setup(of(pageOf([HAUT])));
    api.duplicate.mockReturnValue(of(COPY));

    button('Dupliquer Haut du corps A').click();
    await fixture.whenStable();

    expect(api.duplicate).toHaveBeenCalledWith('w-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Séance dupliquée', detail: COPY.name }),
    );
    expect(navigate).toHaveBeenCalledWith(['/seances', 'w-3']);
  });

  it('signale une séance déjà supprimée à la duplication, puis recharge la liste', async () => {
    await setup(of(pageOf([HAUT])));
    api.duplicate.mockReturnValue(problem(404, 'WORKOUT_NOT_FOUND'));

    button('Dupliquer Haut du corps A').click();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cette séance n'existe plus",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('demande une confirmation qui nomme la séance, puis supprime et recharge', async () => {
    await setup(of(pageOf([HAUT])));
    api.delete.mockReturnValue(of(undefined));
    api.list.mockReturnValue(of(pageOf([])));

    button('Supprimer Haut du corps A').click();
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].header).toBe('Supprimer « Haut du corps A » ?');
    expect(api.delete).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('w-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Séance supprimée' }),
    );
    expect(element.textContent).toContain("Aucune séance pour l'instant");
  });

  it('ne supprime rien si le coach annule', async () => {
    await setup(of(pageOf([HAUT])));

    button('Supprimer Haut du corps A').click();
    confirmations[0].reject?.();

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('signale une séance déjà supprimée (404) puis recharge la liste', async () => {
    await setup(of(pageOf([HAUT])));
    api.delete.mockReturnValue(problem(404, 'WORKOUT_NOT_FOUND'));

    button('Supprimer Haut du corps A').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cette séance n'existe plus",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });
});
