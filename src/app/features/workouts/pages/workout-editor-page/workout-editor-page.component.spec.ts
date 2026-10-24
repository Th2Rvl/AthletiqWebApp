import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { ExerciseApiService } from '../../../../core/api/exercise-api.service';
import {
  Exercise,
  Page,
  Workout,
  WorkoutPayload,
} from '../../../../core/api/models/api.models';
import { WorkoutApiService } from '../../../../core/api/workout-api.service';
import { ExercisePickerComponent } from '../../organisms/exercise-picker/exercise-picker.component';
import { WorkoutEditorComponent } from '../../organisms/workout-editor/workout-editor.component';
import { WorkoutEditorPageComponent } from './workout-editor-page.component';

const SQUAT: Exercise = {
  id: 'ex-1',
  name: 'Squat arrière',
  description: null,
  muscleGroup: 'QUADRICEPS',
  equipment: 'Barre',
  videoUrl: null,
  createdAt: '2026-10-20T08:00:00.000000Z',
  updatedAt: '2026-10-20T08:00:00.000000Z',
};
const WORKOUT: Workout = {
  id: 'w-1',
  name: 'Bas du corps B',
  description: null,
  exercises: [
    {
      position: 0,
      exercise: { id: 'ex-1', name: 'Squat arrière', muscleGroup: 'QUADRICEPS' },
      note: null,
      sets: [{ position: 0, reps: 5, loadKg: 102.5, restSeconds: 180 }],
    },
  ],
  createdAt: '2026-10-20T08:00:00.000000Z',
  updatedAt: '2026-10-21T08:00:00.000000Z',
};
const PAYLOAD: WorkoutPayload = {
  name: 'Bas du corps B',
  description: null,
  exercises: [{ exerciseId: 'ex-1', note: null, sets: [{ reps: 5, loadKg: 102.5, restSeconds: 180 }] }],
};

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, code: string, extra: Record<string, unknown> = {}): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, error: { status, code, detail: 'x', ...extra } }),
  );
}

describe('WorkoutEditorPageComponent', () => {
  let fixture: ComponentFixture<WorkoutEditorPageComponent>;
  let page: WorkoutEditorPageComponent;
  let element: HTMLElement;
  let api: {
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    duplicate: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let exerciseApi: { list: ReturnType<typeof vi.fn> };
  let messages: MessageService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let confirmations: Confirmation[];

  async function setup(
    workoutId: string | undefined,
    options: { get?: Observable<Workout>; library?: Exercise[] } = {},
  ): Promise<void> {
    api = {
      get: vi.fn().mockReturnValue(options.get ?? of(WORKOUT)),
      create: vi.fn(),
      update: vi.fn(),
      duplicate: vi.fn(),
      delete: vi.fn(),
    };
    exerciseApi = { list: vi.fn().mockReturnValue(of(pageOf(options.library ?? [SQUAT]))) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: WorkoutApiService, useValue: api },
        { provide: ExerciseApiService, useValue: exerciseApi },
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
    fixture = TestBed.createComponent(WorkoutEditorPageComponent);
    page = fixture.componentInstance;
    element = fixture.nativeElement;
    if (workoutId) {
      fixture.componentRef.setInput('workoutId', workoutId);
    }
    await fixture.whenStable();
  }

  function editor(): WorkoutEditorComponent {
    return fixture.debugElement.query(By.directive(WorkoutEditorComponent))
      .componentInstance as WorkoutEditorComponent;
  }

  function editorForm(): FormGroup<{ name: FormControl<string> }> {
    return (editor() as unknown as { form: FormGroup<{ name: FormControl<string> }> }).form;
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

  async function makeDirty(): Promise<void> {
    editorForm().controls.name.setValue('Bas du corps C');
    editorForm().controls.name.markAsDirty();
    await fixture.whenStable();
  }

  it('création : éditeur vide, sans lecture de séance', async () => {
    await setup(undefined);

    expect(api.get).not.toHaveBeenCalled();
    expect(element.querySelector('h1')?.textContent).toContain('Nouvelle séance');
    expect(exerciseApi.list).toHaveBeenCalledWith({ page: 0, size: 1 });
  });

  it("crée la séance puis ouvre son éditeur (l'URL devient /seances/:id)", async () => {
    await setup(undefined);
    api.create.mockReturnValue(of(WORKOUT));

    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith(PAYLOAD);
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Séance enregistrée' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/seances', 'w-1'], { replaceUrl: true });
  });

  it('modification : lit la séance et la remplace avec PUT', async () => {
    await setup('w-1');
    api.update.mockReturnValue(of({ ...WORKOUT, name: 'Bas du corps C' }));

    expect(api.get).toHaveBeenCalledWith('w-1');
    expect(element.querySelector('h1')?.textContent).toContain('Bas du corps B');
    await makeDirty();
    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith('w-1', PAYLOAD);
    expect(element.querySelector('h1')?.textContent).toContain('Bas du corps C');
    expect(editor().isDirty()).toBe(false);
    expect(page.canLeave()).toBe(true);
  });

  it('affiche « Cette séance n’existe plus » sur un 404 en lecture', async () => {
    await setup('w-9', { get: problem(404, 'WORKOUT_NOT_FOUND') });

    expect(element.textContent).toContain("Cette séance n'existe plus");
    button('Retour aux séances').click();
    expect(navigate).toHaveBeenCalledWith(['/seances']);
  });

  it('affiche une erreur avec « Réessayer » si la lecture échoue', async () => {
    await setup('w-1', { get: throwError(() => new HttpErrorResponse({ status: 0 })) });

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.get.mockReturnValue(of(WORKOUT));
    button('Réessayer').click();
    await fixture.whenStable();
    expect(element.querySelector('h1')?.textContent).toContain('Bas du corps B');
  });

  it('affiche le 409 de nom sous le champ nom', async () => {
    await setup('w-1');
    api.update.mockReturnValue(
      problem(409, 'WORKOUT_NAME_ALREADY_EXISTS', { field: 'name' }),
    );

    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(element.textContent).toContain('Vous avez déjà une séance de ce nom');
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('affiche les erreurs 400 sur les lignes de l’éditeur', async () => {
    await setup('w-1');
    api.update.mockReturnValue(
      problem(400, 'VALIDATION_FAILED', {
        errors: [{ field: 'exercises[0].sets[0].reps', message: 'Au plus 100 répétitions' }],
      }),
    );

    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    const row = element.querySelector('app-planned-set-row')!;
    expect(row.textContent).toContain('Au plus 100 répétitions');
  });

  it('séance supprimée entre-temps (404 au PUT) : message et retour à la liste', async () => {
    await setup('w-1');
    await makeDirty();
    api.update.mockReturnValue(problem(404, 'WORKOUT_NOT_FOUND'));

    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cette séance n'existe plus",
    });
    expect(navigate).toHaveBeenCalledWith(['/seances']);
    expect(page.canLeave()).toBe(true);
  });

  it('signale un exercice disparu (404 EXERCISE_NOT_FOUND) sans quitter la page', async () => {
    await setup('w-1');
    api.update.mockReturnValue(problem(404, 'EXERCISE_NOT_FOUND'));

    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: "Un exercice de la séance n'existe plus",
      }),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signale un échec réseau à l’enregistrement', async () => {
    await setup('w-1');
    api.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    editor().submitted.emit(PAYLOAD);
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: expect.stringContaining('réessayez') }),
    );
  });

  it('bibliothèque vide : invite à créer des exercices, ajout désactivé', async () => {
    await setup(undefined, { library: [] });

    expect(element.textContent).toContain("Votre bibliothèque d'exercices est vide");
    expect(button('Ajouter des exercices').disabled).toBe(true);
  });

  it("ajoute à la séance les exercices choisis dans le sélecteur (recherche et groupe)", async () => {
    await setup(undefined);

    button('Ajouter des exercices').click();
    await fixture.whenStable();
    expect(exerciseApi.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 100,
      q: '',
      muscleGroup: undefined,
    });
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent))
      .componentInstance as ExercisePickerComponent;
    picker.muscleGroupChange.emit('QUADRICEPS');
    await fixture.whenStable();
    expect(exerciseApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ muscleGroup: 'QUADRICEPS' }),
    );

    picker.picked.emit([{ id: 'ex-1', name: 'Squat arrière', muscleGroup: 'QUADRICEPS' }]);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.directive(ExercisePickerComponent))).toBeNull();
    expect(element.querySelector('.workout-editor__exercise-name')?.textContent).toContain(
      'Squat arrière',
    );
    expect(editor().isDirty()).toBe(true);
  });

  it('laisse partir sans question quand rien n’a changé', async () => {
    await setup('w-1');

    expect(page.canLeave()).toBe(true);
    expect(confirmations).toHaveLength(0);
  });

  it('demande confirmation avant de quitter une séance modifiée', async () => {
    await setup('w-1');
    await makeDirty();

    const stay = page.canLeave();
    expect(isObservable(stay)).toBe(true);
    const stayAnswer = firstValueFrom(stay as Observable<boolean>);
    expect(confirmations[0].header).toBe('Quitter sans enregistrer ?');
    confirmations[0].reject!();
    expect(await stayAnswer).toBe(false);

    const leaveAnswer = firstValueFrom(page.canLeave() as Observable<boolean>);
    confirmations[1].accept!();
    expect(await leaveAnswer).toBe(true);
  });

  it('création : ni « Dupliquer » ni « Supprimer » dans l’en-tête', async () => {
    await setup(undefined);

    expect(() => button('Dupliquer')).toThrow();
    expect(() => button('Supprimer')).toThrow();
    expect(element.textContent).toContain('Séances / Nouvelle');
  });

  it('« Dupliquer » de l’en-tête ouvre la copie', async () => {
    await setup('w-1');
    api.duplicate.mockReturnValue(of({ ...WORKOUT, id: 'w-2', name: 'Bas du corps B (copie)' }));

    button('Dupliquer').click();
    await fixture.whenStable();

    expect(api.duplicate).toHaveBeenCalledWith('w-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Séance dupliquée' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/seances', 'w-2']);
  });

  it('« Supprimer » de l’en-tête demande confirmation, supprime et revient à la liste', async () => {
    await setup('w-1');
    api.delete.mockReturnValue(of(undefined));

    button('Supprimer').click();
    expect(confirmations).toHaveLength(1);
    expect(api.delete).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('w-1');
    expect(navigate).toHaveBeenCalledWith(['/seances']);
    expect(page.canLeave()).toBe(true);
  });

  it('« Annuler » revient à la liste (la garde de sortie décide)', async () => {
    await setup('w-1');

    button('Annuler').click();

    expect(navigate).toHaveBeenCalledWith(['/seances']);
  });
});
