import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import {
  ApiProblem,
  Page,
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

function pageOf<T>(content: T[], totalElements = content.length): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

describe('AthleteTrackingPageComponent', () => {
  let fixture: ComponentFixture<AthleteTrackingPageComponent>;
  let element: HTMLElement;
  let api: { overview: ReturnType<typeof vi.fn>; history: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(
    overview: Observable<TrackingOverview> = of(OVERVIEW),
    history: Observable<Page<SessionHistoryItem>> = of(pageOf([SESSION])),
  ): Promise<void> {
    api = {
      overview: vi.fn().mockReturnValue(overview),
      history: vi.fn().mockReturnValue(history),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TrackingApiService, useValue: api }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AthleteTrackingPageComponent);
    fixture.componentRef.setInput('athleteId', 'ath-1');
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
});
