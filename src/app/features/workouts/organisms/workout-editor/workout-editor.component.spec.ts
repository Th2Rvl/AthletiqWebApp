import { CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Workout, WorkoutPayload } from '../../../../core/api/models/api.models';
import { BulkSetsInputComponent } from '../../molecules/bulk-sets-input/bulk-sets-input.component';
import { WorkoutExerciseForm } from '../../workout-form';
import { WorkoutEditorComponent } from './workout-editor.component';

const SQUAT = { id: 'ex-1', name: 'Squat arrière', muscleGroup: 'QUADRICEPS' as const };
const TIRAGE = { id: 'ex-2', name: 'Tirage horizontal', muscleGroup: 'DOS' as const };
const DIPS = { id: 'ex-3', name: 'Dips', muscleGroup: 'TRICEPS' as const };

const WORKOUT: Workout = {
  id: 'w-1',
  name: 'Haut du corps A',
  description: 'Échauffement de 10 minutes avant la première série.',
  exercises: [
    {
      position: 0,
      exercise: SQUAT,
      note: 'Tempo 3-1-1',
      sets: [
        { position: 0, reps: 8, loadKg: 72.5, restSeconds: 120 },
        { position: 1, reps: 6, loadKg: 77.5, restSeconds: 150 },
      ],
    },
    {
      position: 1,
      exercise: TIRAGE,
      note: null,
      sets: [{ position: 0, reps: 10, loadKg: 47.5, restSeconds: 90 }],
    },
    {
      position: 2,
      exercise: DIPS,
      note: null,
      sets: [{ position: 0, reps: 12, loadKg: null, restSeconds: null }],
    },
  ],
  createdAt: '2026-10-20T08:00:00.000000Z',
  updatedAt: '2026-10-21T08:00:00.000000Z',
};

interface EditorForm {
  form: FormGroup<{
    name: FormControl<string>;
    description: FormControl<string>;
    exercises: FormArray<WorkoutExerciseForm>;
  }>;
}

describe('WorkoutEditorComponent', () => {
  let fixture: ComponentFixture<WorkoutEditorComponent>;
  let component: WorkoutEditorComponent;
  let element: HTMLElement;
  let emitted: WorkoutPayload[];

  async function setup(workout: Workout | null, libraryEmpty = false): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(WorkoutEditorComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.componentRef.setInput('workout', workout);
    fixture.componentRef.setInput('libraryEmpty', libraryEmpty);
    emitted = [];
    component.submitted.subscribe((payload) => emitted.push(payload));
    await fixture.whenStable();
  }

  function form(): EditorForm['form'] {
    return (component as unknown as EditorForm).form;
  }

  function button(text: string): HTMLButtonElement {
    const found = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) =>
        candidate.getAttribute('aria-label') === text || candidate.textContent?.trim() === text,
    );
    if (!found) {
      throw new Error(`Bouton « ${text} » introuvable`);
    }
    return found;
  }

  function exerciseNames(): string[] {
    return [...element.querySelectorAll('.workout-editor__exercise-name')].map((title) =>
      title.textContent!.replace(/Exercice \d+ :/, '').trim(),
    );
  }

  async function save(): Promise<void> {
    button('Enregistrer la séance').click();
    await fixture.whenStable();
  }

  it('reprend la séance : nom, consignes, exercices dans l’ordre et séries', async () => {
    await setup(WORKOUT);

    expect(element.querySelector<HTMLInputElement>('#workout-name')!.value).toBe(
      'Haut du corps A',
    );
    expect(exerciseNames()).toEqual(['Squat arrière', 'Tirage horizontal', 'Dips']);
    expect(element.querySelectorAll('app-planned-set-row')).toHaveLength(4);
    expect(component.isDirty()).toBe(false);
  });

  it('enregistre la séance telle quelle, positions implicites et champs vides à null', async () => {
    await setup(WORKOUT);

    await save();

    expect(emitted).toEqual([
      {
        name: 'Haut du corps A',
        description: 'Échauffement de 10 minutes avant la première série.',
        exercises: [
          {
            exerciseId: 'ex-1',
            note: 'Tempo 3-1-1',
            sets: [
              { reps: 8, loadKg: 72.5, restSeconds: 120 },
              { reps: 6, loadKg: 77.5, restSeconds: 150 },
            ],
          },
          { exerciseId: 'ex-2', note: null, sets: [{ reps: 10, loadKg: 47.5, restSeconds: 90 }] },
          { exerciseId: 'ex-3', note: null, sets: [{ reps: 12, loadKg: null, restSeconds: null }] },
        ],
      },
    ]);
  });

  it('bloque l’enregistrement sans nom ni exercice et le dit', async () => {
    await setup(null);

    await save();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Le nom de la séance est obligatoire');
    expect(element.textContent).toContain('Ajoutez au moins un exercice');
    expect(element.textContent).toContain("La séance n'est pas enregistrée");
  });

  it('ajoute un exercice de la bibliothèque sans série, puis exige au moins une série', async () => {
    await setup(null);
    form().controls.name.setValue('Bas du corps B');

    component.addExercises([SQUAT]);
    await fixture.whenStable();

    expect(exerciseNames()).toEqual(['Squat arrière']);
    expect(component.isDirty()).toBe(true);
    expect(element.textContent).toContain('Aucune série');
    await save();
    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Ajoutez au moins une série');
  });

  it('crée N séries identiques (« 4 séries de 8 à 60 kg »), chacune modifiable', async () => {
    await setup(null);
    form().controls.name.setValue('Bas du corps B');
    component.addExercises([SQUAT]);
    await fixture.whenStable();

    const bulk = fixture.debugElement.query(By.directive(BulkSetsInputComponent))
      .componentInstance as BulkSetsInputComponent;
    (bulk as unknown as { form: FormGroup }).form.setValue({
      count: 4,
      reps: 8,
      loadKg: 60,
      restSeconds: 90,
    });
    await fixture.whenStable();
    button('Créer 4 séries').click();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-planned-set-row')).toHaveLength(4);
    form().controls.exercises.at(0).controls.sets.at(3).controls.reps.setValue(6);
    await save();
    expect(emitted[0].exercises[0].sets).toEqual([
      { reps: 8, loadKg: 60, restSeconds: 90 },
      { reps: 8, loadKg: 60, restSeconds: 90 },
      { reps: 8, loadKg: 60, restSeconds: 90 },
      { reps: 6, loadKg: 60, restSeconds: 90 },
    ]);
  });

  it('« Ajouter une série » reprend les valeurs de la série précédente, repos compris', async () => {
    await setup(WORKOUT);

    button('Ajouter une série à Tirage horizontal').click();
    await fixture.whenStable();
    await save();

    expect(emitted[0].exercises[1].sets).toEqual([
      { reps: 10, loadKg: 47.5, restSeconds: 90 },
      { reps: 10, loadKg: 47.5, restSeconds: 90 },
    ]);
  });

  it('valide les séries comme l’API : répétitions, charge au pas de 0,5, repos', async () => {
    await setup(WORKOUT);
    const set = form().controls.exercises.at(0).controls.sets.at(0).controls;
    set.reps.setValue(0);
    set.loadKg.setValue(60.3);
    set.restSeconds.setValue(601);

    await save();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Entre 1 et 100 répétitions');
    expect(element.textContent).toContain('Multiple de 0,5 kg');
    expect(element.textContent).toContain('Entre 0 et 600 secondes');
  });

  it('déplace C en tête avec « Monter » au clavier et garde les séries', async () => {
    await setup(WORKOUT);

    button('Monter Dips').click();
    await fixture.whenStable();
    button('Monter Dips').click();
    await fixture.whenStable();

    expect(exerciseNames()).toEqual(['Dips', 'Squat arrière', 'Tirage horizontal']);
    expect(element.textContent).toContain('Dips déplacé en position 1 sur 3');
    expect(component.isDirty()).toBe(true);
    await save();
    expect(emitted[0].exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'ex-3',
      'ex-1',
      'ex-2',
    ]);
    expect(emitted[0].exercises[1].sets).toHaveLength(2);
  });

  it('déplace avec « Descendre » et désactive les boutons aux extrémités', async () => {
    await setup(WORKOUT);

    expect(button('Monter Squat arrière').disabled).toBe(true);
    expect(button('Descendre Dips').disabled).toBe(true);
    button('Descendre Squat arrière').click();
    await fixture.whenStable();

    expect(exerciseNames()).toEqual(['Tirage horizontal', 'Squat arrière', 'Dips']);
  });

  it('réordonne au glisser-déposer', async () => {
    await setup(WORKOUT);
    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

    dropList.dropped.emit({ previousIndex: 2, currentIndex: 0 } as never);
    await fixture.whenStable();

    expect(exerciseNames()).toEqual(['Dips', 'Squat arrière', 'Tirage horizontal']);
  });

  it('désactive Monter et Descendre pour une séance d’un seul exercice', async () => {
    await setup({ ...WORKOUT, exercises: [WORKOUT.exercises[0]] });

    expect(button('Monter Squat arrière').disabled).toBe(true);
    expect(button('Descendre Squat arrière').disabled).toBe(true);
  });

  it('retire un exercice de la séance', async () => {
    await setup(WORKOUT);

    button('Retirer Tirage horizontal de la séance').click();
    await fixture.whenStable();

    expect(exerciseNames()).toEqual(['Squat arrière', 'Dips']);
  });

  it('affiche les erreurs de l’API sous le champ concerné, chemins imbriqués compris', async () => {
    await setup(WORKOUT);

    fixture.componentRef.setInput('serverErrors', {
      name: 'Vous avez déjà une séance de ce nom',
      'exercises[1].sets[0].loadKg': 'La charge doit être un multiple de 0,5 kg',
      'exercises[2].note': 'La note ne doit pas dépasser 500 caractères',
    });
    await fixture.whenStable();

    expect(element.textContent).toContain('Vous avez déjà une séance de ce nom');
    expect(element.textContent).toContain('La charge doit être un multiple de 0,5 kg');
    expect(element.textContent).toContain('La note ne doit pas dépasser 500 caractères');

    form().controls.name.setValue('Haut du corps B');
    await fixture.whenStable();
    expect(element.textContent).not.toContain('Vous avez déjà une séance de ce nom');
    expect(element.textContent).toContain('La charge doit être un multiple de 0,5 kg');

    button('Monter Dips').click();
    await fixture.whenStable();
    expect(element.textContent).not.toContain('La charge doit être un multiple de 0,5 kg');
  });

  it('bibliothèque vide : invite à créer des exercices et désactive l’ajout', async () => {
    await setup(null, true);

    expect(element.textContent).toContain("Votre bibliothèque d'exercices est vide");
    expect(element.querySelector('a[href="/exercices"]')).toBeTruthy();
    expect(button('Ajouter des exercices').disabled).toBe(true);
  });

  it('demande l’ajout d’exercices à la page', async () => {
    await setup(null);
    const requested = vi.fn();
    component.addRequested.subscribe(requested);

    button('Ajouter des exercices').click();

    expect(requested).toHaveBeenCalled();
  });

  it('redevient « non modifié » quand la page lui redonne la séance enregistrée', async () => {
    await setup(WORKOUT);
    form().controls.name.setValue('Haut du corps B');
    form().controls.name.markAsDirty();
    expect(component.isDirty()).toBe(true);

    fixture.componentRef.setInput('workout', { ...WORKOUT, name: 'Haut du corps B' });
    await fixture.whenStable();

    expect(component.isDirty()).toBe(false);
  });
});
