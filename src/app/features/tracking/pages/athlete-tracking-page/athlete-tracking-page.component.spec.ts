import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import {
  ApiProblem,
  Page,
  PerformedExercise,
  Progression,
  SessionHistoryItem,
  TrackingOverview,
} from '../../../../core/api/models/api.models';
import { TrackingApiService } from '../../../../core/api/tracking-api.service';
import { SessionHistoryTableComponent } from '../../organisms/session-history-table/session-history-table.component';
import { AthleteTrackingPageComponent } from './athlete-tracking-page.component';

const OVERVIEW: TrackingOverview = {
  athleteId: 'ath-1',
  firstName: 'Lucas',
  lastName: 'Durand',
  today: '2026-11-05',
  hasPastSessions: true,
};
const SESSION: SessionHistoryItem = {
  plannedSessionId: 'ps-3',
  date: '2026-11-03',
  name: 'Haut du corps A',
  status: 'DONE',
  rpe: 8,
  fatigue: 4,
  hasComment: true,
  validatedAt: '2026-11-03T18:42:00Z',
  correctedAt: null,
};

const EXERCISES: PerformedExercise[] = [
  {
    exerciseId: 'ex-1',
    exerciseName: 'Squat',
    muscleGroup: 'QUADRICEPS',
    sessionCount: 6,
    lastPerformedOn: '2026-10-13',
  },
  {
    exerciseId: 'ex-2',
    exerciseName: 'Tractions',
    muscleGroup: 'DOS',
    sessionCount: 3,
    lastPerformedOn: '2026-11-03',
  },
];
const PROGRESSION: Progression = {
  athleteId: 'ath-1',
  exerciseId: 'ex-2',
  exerciseName: 'Tractions',
  muscleGroup: 'DOS',
  bodyweight: true,
  weeks: 12,
  from: '2026-08-13',
  today: '2026-11-05',
  points: [
    { plannedSessionId: 'ps-3', date: '2026-11-03', maxLoadKg: null, maxReps: 9, volumeKg: null },
  ],
};

function pageOf<T>(content: T[], totalElements = content.length): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

/** `p-tabs` observe la taille de ses onglets ; jsdom n'a pas de `ResizeObserver`. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('AthleteTrackingPageComponent', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  let fixture: ComponentFixture<AthleteTrackingPageComponent>;
  let element: HTMLElement;
  let api: Record<
    'overview' | 'history' | 'performedExercises' | 'progression' | 'personalRecords',
    ReturnType<typeof vi.fn>
  >;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(
    overview: Observable<TrackingOverview> = of(OVERVIEW),
    history: Observable<Page<SessionHistoryItem>> = of(pageOf([SESSION])),
    onglet?: string,
  ): Promise<void> {
    api = {
      overview: vi.fn().mockReturnValue(overview),
      history: vi.fn().mockReturnValue(history),
      performedExercises: vi.fn().mockReturnValue(of(EXERCISES)),
      progression: vi.fn().mockReturnValue(of(PROGRESSION)),
      personalRecords: vi.fn().mockReturnValue(of({ athleteId: 'ath-1', records: [] })),
    };
    // Le graphique de l'onglet Progression : jsdom ne dessine pas sur un canvas.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TrackingApiService, useValue: api }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AthleteTrackingPageComponent);
    fixture.componentRef.setInput('athleteId', 'ath-1');
    if (onglet) {
      fixture.componentRef.setInput('onglet', onglet);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function table(): SessionHistoryTableComponent {
    return fixture.debugElement.query(By.directive(SessionHistoryTableComponent)).componentInstance;
  }

  it("lit l'en-tête puis l'historique des 4 dernières semaines d'après le today de l'API", async () => {
    await setup();

    expect(api.overview).toHaveBeenCalledWith('ath-1');
    expect(api.history).toHaveBeenCalledWith('ath-1', {
      page: 0,
      size: 20,
      from: '2026-10-09',
      to: '2026-11-05',
      status: undefined,
      withComment: false,
    });
    expect(element.querySelector('h1')?.textContent).toContain('Lucas Durand');
    expect(element.textContent).toContain('Haut du corps A');
  });

  it('recharge la première page à chaque changement de filtre', async () => {
    await setup();
    api.history.mockClear();

    table().filtersChange.emit({ status: 'MISSED', withComment: true, weeks: 12 });
    await fixture.whenStable();

    expect(api.history).toHaveBeenCalledWith('ath-1', {
      page: 0,
      size: 20,
      from: '2026-08-14',
      to: '2026-11-05',
      status: 'MISSED',
      withComment: true,
    });
  });

  it('pagine côté serveur', async () => {
    await setup(of(OVERVIEW), of(pageOf([SESSION], 45)));
    api.history.mockClear();

    table().pageChange.emit({ first: 20, rows: 20 });

    expect(api.history).toHaveBeenCalledWith(
      'ath-1',
      expect.objectContaining({ page: 1, size: 20 }),
    );
  });

  it('sans séance passée : état vide et lien « Planifier » vers le calendrier', async () => {
    await setup(of({ ...OVERVIEW, hasPastSessions: false }));

    expect(api.history).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Aucune séance passée pour cet athlète');
    const plan = [...element.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Planifier'),
    )!;
    plan.click();
    expect(navigate).toHaveBeenCalledWith(['/planning/athletes', 'ath-1']);
  });

  it('athlète non suivi, inconnu ou lien clos : « Cet athlète n’est plus suivi »', async () => {
    await setup(problem(404, { code: 'ATHLETE_NOT_FOUND' }));

    expect(element.textContent).toContain("Cet athlète n'est plus suivi");
    expect(api.history).not.toHaveBeenCalled();
  });

  it('échec réseau : message et « Réessayer » qui relit le suivi', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.overview.mockReturnValue(of(OVERVIEW));
    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Réessayer'))!
      .click();
    await fixture.whenStable();

    expect(api.overview).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Haut du corps A');
  });

  it("affiche l'erreur de l'historique par son code, avec « Réessayer »", async () => {
    await setup(of(OVERVIEW), problem(400, { code: 'INVALID_PARAMETER' }));

    expect(element.textContent).toContain('Période invalide');
    expect(element.textContent).toContain('Réessayer');
  });

  it("garde l'onglet dans l'URL", async () => {
    await setup();

    fixture.debugElement.query(By.css('p-tabs')).triggerEventHandler('valueChange', 'records');

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { onglet: 'records' } }),
    );
  });

  it("onglet Progression : l'exercice réalisé le plus récemment, sur 12 semaines par défaut", async () => {
    await setup(of(OVERVIEW), of(pageOf([SESSION])), 'progression');

    expect(api.history).not.toHaveBeenCalled();
    expect(api.performedExercises).toHaveBeenCalledWith('ath-1');
    expect(api.progression).toHaveBeenCalledWith('ath-1', 'ex-2', 12);
    expect(element.textContent).toContain('Pas encore assez de données pour une progression');

    fixture.debugElement.query(By.css('app-period-picker')).triggerEventHandler('weeksChange', 26);
    expect(api.progression).toHaveBeenLastCalledWith('ath-1', 'ex-2', 26);

    fixture.debugElement
      .query(By.css('p-select'))
      .triggerEventHandler('onChange', { value: 'ex-1' });
    expect(api.progression).toHaveBeenLastCalledWith('ath-1', 'ex-1', 26);
  });

  it('onglet Progression sans séance réalisée : « Aucune séance réalisée pour cet athlète »', async () => {
    await setup(of(OVERVIEW), of(pageOf([SESSION])), 'progression');
    api.performedExercises.mockReturnValue(of([]));
    // Un autre athlète, pour relire l'onglet avec la liste vide.
    fixture.componentRef.setInput('athleteId', 'ath-9');
    await fixture.whenStable();

    expect(element.textContent).toContain('Aucune séance réalisée pour cet athlète');
  });

  it('onglet Progression : un exercice disparu relit la liste des exercices', async () => {
    await setup(of(OVERVIEW), of(pageOf([SESSION])), 'progression');
    api.progression.mockReturnValueOnce(problem(404, { code: 'EXERCISE_NOT_FOUND' }));

    fixture.debugElement.query(By.css('app-period-picker')).triggerEventHandler('weeksChange', 4);
    await fixture.whenStable();

    expect(api.performedExercises).toHaveBeenCalledTimes(2);
  });

  it('onglet Records : « Aucun record pour l’instant » sans record', async () => {
    await setup(of(OVERVIEW), of(pageOf([SESSION])), 'records');

    expect(api.personalRecords).toHaveBeenCalledWith('ath-1');
    expect(element.textContent).toContain("Aucun record pour l'instant");
  });

  it("athlète retiré pendant la consultation d'un onglet : « Cet athlète n'est plus suivi »", async () => {
    await setup(of(OVERVIEW), of(pageOf([SESSION])), 'records');
    api.personalRecords.mockReturnValue(problem(404, { code: 'ATHLETE_NOT_FOUND' }));
    fixture.componentRef.setInput('athleteId', 'ath-9');
    await fixture.whenStable();

    expect(element.textContent).toContain("Cet athlète n'est plus suivi");
  });
});
