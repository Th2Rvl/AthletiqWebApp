import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ExerciseApiService } from '../../../../core/api/exercise-api.service';
import { Exercise, ExercisePayload, Page } from '../../../../core/api/models/api.models';
import { ExerciseFormComponent } from '../../organisms/exercise-form/exercise-form.component';
import { ExerciseTableComponent } from '../../organisms/exercise-table/exercise-table.component';
import { ExerciseListPageComponent } from './exercise-list-page.component';

const SQUAT: Exercise = {
  id: 'ex-1',
  name: 'Squat arrière',
  description: null,
  muscleGroup: 'QUADRICEPS',
  equipment: 'Barre',
  videoUrl: 'https://videos.example.fr/squat',
  createdAt: '2026-10-20T08:00:00.000000Z',
  updatedAt: '2026-10-20T08:00:00.000000Z',
};
const TIRAGE: Exercise = {
  ...SQUAT,
  id: 'ex-2',
  name: 'Tirage horizontal',
  muscleGroup: 'DOS',
  equipment: null,
  videoUrl: null,
};
const PAYLOAD: ExercisePayload = {
  name: 'Fentes marchées',
  description: null,
  muscleGroup: 'QUADRICEPS',
  equipment: null,
  videoUrl: null,
};

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(
  status: number,
  code = 'X',
  extra: Record<string, unknown> = {},
): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, error: { status, code, detail: 'x', ...extra } }),
  );
}

describe('ExerciseListPageComponent', () => {
  let fixture: ComponentFixture<ExerciseListPageComponent>;
  let element: HTMLElement;
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let messages: MessageService;
  let confirmations: Confirmation[];

  async function setup(firstPage: Observable<Page<Exercise>>): Promise<void> {
    api = {
      list: vi.fn().mockReturnValue(firstPage),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        MessageService,
        ConfirmationService,
        { provide: ExerciseApiService, useValue: api },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });

    fixture = TestBed.createComponent(ExerciseListPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function buttonByText(text: string, root: ParentNode = element): HTMLButtonElement {
    const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (!button) {
      throw new Error(`Bouton « ${text} » introuvable`);
    }
    return button;
  }

  function table(): ExerciseTableComponent {
    return fixture.debugElement.query(By.directive(ExerciseTableComponent))
      .componentInstance as ExerciseTableComponent;
  }

  function form(): ExerciseFormComponent {
    return fixture.debugElement.query(By.directive(ExerciseFormComponent))
      .componentInstance as ExerciseFormComponent;
  }

  it('affiche les exercices avec leur groupe musculaire et leur matériel', async () => {
    await setup(of(pageOf([SQUAT, TIRAGE])));

    expect(api.list).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      q: '',
      muscleGroup: undefined,
      equipment: '',
    });
    expect(element.textContent).toContain('Squat arrière');
    expect(element.textContent).toContain('Quadriceps');
    expect(element.textContent).toContain('Barre');
    expect(element.textContent).toContain('Tirage horizontal');
    expect(element.textContent).toContain('Dos');
  });

  it("affiche l'état vide avec l'action de création", async () => {
    await setup(of(pageOf([])));

    expect(element.textContent).toContain("Aucun exercice pour l'instant");
    expect(buttonByText('Créer un exercice')).toBeTruthy();
  });

  it('affiche les squelettes pendant le chargement', async () => {
    api = {
      list: vi.fn().mockReturnValue(new Subject<Page<Exercise>>()),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        MessageService,
        ConfirmationService,
        { provide: ExerciseApiService, useValue: api },
      ],
    });
    fixture = TestBed.createComponent(ExerciseListPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();

    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain("Aucun exercice pour l'instant");
  });

  it('affiche une erreur avec une action de reprise', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.list.mockReturnValue(of(pageOf([SQUAT])));
    buttonByText('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Squat arrière');
  });

  it('filtre par groupe musculaire : la liste est rechargée avec le filtre', async () => {
    await setup(of(pageOf([SQUAT, TIRAGE])));

    table().muscleGroupChange.emit('DOS');
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 20,
      q: '',
      muscleGroup: 'DOS',
      equipment: '',
    });
  });

  it('recherche par nom : la saisie est débouncée puis envoyée (q)', async () => {
    await setup(of(pageOf([SQUAT, TIRAGE])));

    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'squat';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 20,
      q: 'squat',
      muscleGroup: undefined,
      equipment: '',
    });
  });

  it('filtre par matériel, saisi en texte libre', async () => {
    await setup(of(pageOf([SQUAT])));

    table().equipmentChange.emit('Haltères');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ equipment: 'Haltères' }));
  });

  it('crée un exercice puis recharge la liste', async () => {
    await setup(of(pageOf([SQUAT])));
    api.create.mockReturnValue(of({ ...SQUAT, id: 'ex-3', name: 'Fentes marchées' }));

    buttonByText('Créer un exercice').click();
    await fixture.whenStable();
    form().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith(PAYLOAD);
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Exercice créé' }),
    );
  });

  it('affiche « Vous avez déjà un exercice de ce nom » sous le champ sur un 409', async () => {
    await setup(of(pageOf([SQUAT])));
    api.create.mockReturnValue(
      problem(409, 'EXERCISE_NAME_ALREADY_EXISTS', { field: 'name' }),
    );

    buttonByText('Créer un exercice').click();
    await fixture.whenStable();
    form().submitted.emit({ ...PAYLOAD, name: 'squat arrière' });
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Vous avez déjà un exercice de ce nom');
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('modifie un exercice avec PUT (tous les champs) puis recharge la liste', async () => {
    await setup(of(pageOf([SQUAT])));
    api.update.mockReturnValue(of({ ...SQUAT, name: 'Squat avant' }));

    buttonByText('Modifier').click();
    await fixture.whenStable();
    const payload = {
      ...PAYLOAD,
      name: 'Squat avant',
      muscleGroup: 'QUADRICEPS' as const,
      equipment: 'Barre',
    };
    form().submitted.emit(payload);
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith('ex-1', payload);
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Exercice modifié' }),
    );
  });

  it('signale « Cet exercice n’existe plus » sur un 404 en modification', async () => {
    await setup(of(pageOf([SQUAT])));
    api.update.mockReturnValue(problem(404));

    buttonByText('Modifier').click();
    await fixture.whenStable();
    form().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cet exercice n'existe plus",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('demande confirmation avant de supprimer, puis supprime et recharge', async () => {
    await setup(of(pageOf([SQUAT])));
    api.delete.mockReturnValue(of(undefined));
    api.list.mockReturnValue(of(pageOf([])));

    buttonByText('Supprimer').click();
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].header).toContain('Squat arrière');
    expect(api.delete).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('ex-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Exercice supprimé' }),
    );
    expect(element.textContent).toContain("Aucun exercice pour l'instant");
  });

  it('montre la taille de la bibliothèque au-dessus du titre', async () => {
    await setup(of(pageOf([SQUAT, TIRAGE])));

    expect(element.querySelector('app-page-header')?.textContent).toContain('2 exercices');
  });

  it('ouvre la modification dans le panneau latéral et surligne la ligne', async () => {
    await setup(of(pageOf([SQUAT])));

    buttonByText('Modifier').click();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Modifier l’exercice');
    expect(element.querySelector('.exercise-table__row--editing')?.textContent).toContain(
      'Squat arrière',
    );
  });

  it('supprime depuis le panneau après confirmation, puis ferme le panneau', async () => {
    await setup(of(pageOf([SQUAT])));
    api.delete.mockReturnValue(of(undefined));

    buttonByText('Modifier').click();
    await fixture.whenStable();
    form().removeRequested.emit();
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].header).toContain('Squat arrière');

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('ex-1');
    expect(fixture.debugElement.query(By.directive(ExerciseFormComponent))).toBeNull();
  });

  it('ne supprime pas si la confirmation est annulée', async () => {
    await setup(of(pageOf([SQUAT])));

    buttonByText('Supprimer').click();

    expect(confirmations).toHaveLength(1);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('signale un exercice déjà supprimé (404) puis recharge la liste', async () => {
    await setup(of(pageOf([SQUAT])));
    api.delete.mockReturnValue(problem(404));

    buttonByText('Supprimer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cet exercice n'existe plus",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('signale EXERCISE_IN_USE avec le nombre de séances, sans rien supprimer', async () => {
    await setup(of(pageOf([SQUAT])));
    api.delete.mockReturnValue(problem(409, 'EXERCISE_IN_USE', { workoutCount: 3 }));

    buttonByText('Supprimer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'Cet exercice est utilisé dans 3 séances',
      }),
    );
    expect(messages.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Exercice supprimé' }),
    );
    expect(element.textContent).toContain('Squat arrière');
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('distingue séances et séances planifiées dans EXERCISE_IN_USE (#6)', async () => {
    await setup(of(pageOf([SQUAT])));
    api.delete.mockReturnValue(
      problem(409, 'EXERCISE_IN_USE', { workoutCount: 2, plannedSessionCount: 3 }),
    );

    buttonByText('Supprimer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'Cet exercice est utilisé dans 2 séances et 3 séances planifiées',
      }),
    );
  });

  it('ne confond pas EXERCISE_IN_USE avec le nom en double', async () => {
    await setup(of(pageOf([SQUAT])));
    api.delete.mockReturnValue(problem(409, 'EXERCISE_IN_USE', { workoutCount: 1 }));

    buttonByText('Supprimer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Cet exercice est utilisé dans 1 séance' }),
    );
    expect(document.body.textContent).not.toContain('Vous avez déjà un exercice de ce nom');
  });
});
