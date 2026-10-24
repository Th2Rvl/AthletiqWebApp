import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { Exercise, ExercisePayload, MuscleGroup } from '../../../../core/api/models/api.models';
import { ExerciseFormComponent } from './exercise-form.component';

const SQUAT: Exercise = {
  id: 'ex-1',
  name: 'Squat arrière',
  description: 'Barre sur les trapèzes, descente jusqu’à la parallèle.',
  muscleGroup: 'QUADRICEPS',
  equipment: 'Barre',
  videoUrl: 'https://videos.example.fr/squat',
  createdAt: '2026-10-20T08:00:00.000000Z',
  updatedAt: '2026-10-20T08:00:00.000000Z',
};

describe('ExerciseFormComponent', () => {
  let fixture: ComponentFixture<ExerciseFormComponent>;
  let element: HTMLElement;
  let submitted: ExercisePayload[];

  async function setup(exercise: Exercise | null = null): Promise<void> {
    fixture = TestBed.createComponent(ExerciseFormComponent);
    fixture.componentRef.setInput('exercise', exercise);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function type(selector: string, value: string): void {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  /** Choisit le groupe musculaire par la valeur du formulaire (le p-select s'ouvre en overlay). */
  function chooseMuscleGroup(value: MuscleGroup): void {
    const control = (fixture.componentInstance as unknown as { form: FormGroup }).form.controls[
      'muscleGroup'
    ];
    control.setValue(value);
    control.markAsTouched();
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  it('désactive la validation tant que le nom et le groupe musculaire sont absents', async () => {
    await setup();
    expect(submitButton().disabled).toBe(true);
  });

  it('refuse un nom vide après trim et affiche « obligatoire »', async () => {
    await setup();
    type('#exercise-name', '   ');
    chooseMuscleGroup('PECTORAUX');
    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain('Le nom est obligatoire');
  });

  it('refuse un nom de plus de 200 caractères', async () => {
    await setup();
    type('#exercise-name', 'x'.repeat(201));
    expect(element.textContent).toContain('Le nom doit contenir entre 1 et 200 caractères');
  });

  it('refuse une adresse vidéo qui n’est pas une URL http(s)', async () => {
    await setup();
    type('#exercise-name', 'Développé couché');
    chooseMuscleGroup('PECTORAUX');
    type('#exercise-video-url', 'pas une adresse');

    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain('Saisissez une adresse web complète');
  });

  it('refuse une description de plus de 1000 caractères', async () => {
    await setup();
    type('#exercise-name', 'Développé couché');
    chooseMuscleGroup('PECTORAUX');
    type('#exercise-description', 'x'.repeat(1001));
    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain('La description ne doit pas dépasser 1000 caractères');
  });

  it('émet une valeur normalisée : trim, champs facultatifs vides à null', async () => {
    await setup();
    type('#exercise-name', '  Développé couché  ');
    chooseMuscleGroup('PECTORAUX');
    type('#exercise-equipment', '   ');
    type('#exercise-description', '');
    submitButton().click();

    expect(submitted).toEqual([
      {
        name: 'Développé couché',
        description: null,
        muscleGroup: 'PECTORAUX',
        equipment: null,
        videoUrl: null,
      },
    ]);
  });

  it('émet la vidéo et le matériel saisis, sans espaces de bord', async () => {
    await setup();
    type('#exercise-name', 'Rowing barre');
    chooseMuscleGroup('DOS');
    type('#exercise-equipment', ' Barre ');
    type('#exercise-video-url', ' https://videos.example.fr/rowing ');
    submitButton().click();

    expect(submitted).toEqual([
      {
        name: 'Rowing barre',
        description: null,
        muscleGroup: 'DOS',
        equipment: 'Barre',
        videoUrl: 'https://videos.example.fr/rowing',
      },
    ]);
  });

  it('pré-remplit le formulaire en modification et envoie tous les champs', async () => {
    await setup(SQUAT);

    expect(element.querySelector<HTMLInputElement>('#exercise-name')!.value).toBe(SQUAT.name);
    expect(element.querySelector<HTMLInputElement>('#exercise-equipment')!.value).toBe('Barre');
    expect(submitButton().textContent).toContain("Enregistrer l'exercice");
    submitButton().click();
    expect(submitted).toEqual([
      {
        name: SQUAT.name,
        description: SQUAT.description,
        muscleGroup: 'QUADRICEPS',
        equipment: 'Barre',
        videoUrl: SQUAT.videoUrl,
      },
    ]);
  });

  it("affiche l'erreur du serveur sous le champ (409 sur le nom), puis l'efface quand on corrige", async () => {
    await setup();
    type('#exercise-name', 'squat arrière');
    chooseMuscleGroup('QUADRICEPS');
    fixture.componentRef.setInput('serverErrors', {
      name: 'Vous avez déjà un exercice de ce nom',
    });
    fixture.detectChanges();
    expect(element.textContent).toContain('Vous avez déjà un exercice de ce nom');

    type('#exercise-name', 'Squat avant');
    expect(element.textContent).not.toContain('Vous avez déjà un exercice de ce nom');
  });
});
