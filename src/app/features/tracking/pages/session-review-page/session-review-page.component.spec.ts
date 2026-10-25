import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { SessionReview } from '../../../../core/api/models/api.models';
import { TrackingApiService } from '../../../../core/api/tracking-api.service';
import { SessionReviewPageComponent } from './session-review-page.component';

const REVIEW: SessionReview = {
  plannedSessionId: 'ps-3',
  athleteId: 'ath-1',
  athleteFirstName: 'Lucas',
  athleteLastName: 'Durand',
  date: '2026-11-03',
  today: '2026-11-05',
  name: 'Haut du corps A',
  description: 'Tempo contrôlé à la descente',
  status: 'DONE',
  feedback: {
    rpe: 8,
    fatigue: 4,
    comment: 'Dernière série difficile',
    validatedAt: '2026-11-03T17:42:00Z',
    correctedAt: null,
  },
  exercises: [
    {
      snapshotExerciseId: 'se-1',
      exerciseId: 'ex-1',
      exerciseName: 'Développé couché',
      muscleGroup: 'PECTORAUX',
      position: 0,
      note: null,
      bodyweight: false,
      plannedVolumeKg: 500,
      performedVolumeKg: 480,
      volumeDeltaPercent: -4,
      sets: [
        {
          snapshotSetId: 'ss-1',
          position: 0,
          plannedReps: 8,
          plannedLoadKg: 62.5,
          restSeconds: 90,
          done: true,
          performedReps: 8,
          performedLoadKg: 60,
          repsDelta: 0,
          loadDeltaKg: -2.5,
        },
      ],
    },
  ],
};

describe('SessionReviewPageComponent', () => {
  let fixture: ComponentFixture<SessionReviewPageComponent>;
  let element: HTMLElement;
  let review: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(response: Observable<SessionReview>): Promise<void> {
    review = vi.fn().mockReturnValue(response);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TrackingApiService, useValue: { review } }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SessionReviewPageComponent);
    fixture.componentRef.setInput('athleteId', 'ath-1');
    fixture.componentRef.setInput('plannedSessionId', 'ps-3');
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('séance réalisée : ressenti, puis prévu et réalisé, en lecture seule', async () => {
    await setup(of(REVIEW));

    expect(review).toHaveBeenCalledWith('ps-3');
    expect(element.querySelector('h1')?.textContent).toContain('Haut du corps A');
    expect(element.textContent).toContain('mardi 3 novembre 2026');
    expect(element.textContent).toContain('Réalisée');
    expect(element.textContent).toContain('Ressenti');
    expect(element.textContent).toContain('Dernière série difficile');
    expect(element.textContent).toContain('Prévu et réalisé');
    expect(element.textContent).toContain('-2,5 kg');
    expect(element.querySelectorAll('button, input, textarea')).toHaveLength(0);
    const back = [...element.querySelectorAll('a')].find((link) =>
      link.textContent?.includes('Lucas Durand'),
    );
    expect(back?.getAttribute('href')).toBe('/athletes/ath-1/suivi');
  });

  it('séance non faite : le prévu seul et « Séance non faite », sans ressenti', async () => {
    await setup(of({ ...REVIEW, status: 'MISSED', feedback: null }));

    expect(element.textContent).toContain('Non faite');
    expect(element.textContent).toContain('Séance non faite : seul le prévu est affiché.');
    expect(element.textContent).not.toContain('Ressenti');
    expect(element.textContent).not.toContain('Réalisé');
  });

  it('séance à venir : « À venir », le prévu seul', async () => {
    await setup(of({ ...REVIEW, date: '2026-11-12', status: 'UPCOMING', feedback: null }));

    expect(element.textContent).toContain('À venir : seul le prévu est affiché.');
  });

  it('séance d’un autre coach, annulée ou lien clos : état dédié et retour au suivi', async () => {
    await setup(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { status: 404, code: 'PLANNED_SESSION_NOT_FOUND' },
          }),
      ),
    );

    expect(element.textContent).toContain("Cette séance planifiée n'existe plus");
    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Retour au suivi'))!
      .click();
    expect(navigate).toHaveBeenCalledWith(['/athletes', 'ath-1', 'suivi']);
  });

  it('échec réseau : message et « Réessayer »', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    review.mockReturnValue(of(REVIEW));
    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Réessayer'))!
      .click();
    await fixture.whenStable();

    expect(element.textContent).toContain('Prévu et réalisé');
  });
});
