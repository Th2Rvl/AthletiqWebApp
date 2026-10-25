import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Page, SessionHistoryItem, SessionReview, TrackingOverview } from './models/api.models';
import { TrackingApiService } from './tracking-api.service';

const API = environment.apiUrl;

describe('TrackingApiService', () => {
  let api: TrackingApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TrackingApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("lit l'en-tête du suivi d'un athlète", () => {
    let overview: TrackingOverview | undefined;
    api.overview('ath-1').subscribe((value) => (overview = value));
    const request = http.expectOne(`${API}/athletes/ath-1/tracking`);
    expect(request.request.method).toBe('GET');
    const body: TrackingOverview = {
      athleteId: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Durand',
      today: '2026-11-05',
      hasPastSessions: true,
    };
    request.flush(body);
    expect(overview).toEqual(body);
  });

  it("lit l'historique avec la page et sans envoyer les filtres absents", () => {
    let page: Page<SessionHistoryItem> | undefined;
    api.history('ath-1', { page: 0, size: 20 }).subscribe((value) => (page = value));
    const request = http.expectOne((req) => req.url === `${API}/athletes/ath-1/session-history`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size']);
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({
      content: [],
      page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
    });
    expect(page?.page.totalElements).toBe(0);
  });

  it("envoie la période, le statut et « avec commentaire » de l'historique", () => {
    api
      .history('ath-1', {
        page: 2,
        size: 20,
        from: '2026-08-14',
        to: '2026-11-05',
        status: 'MISSED',
        withComment: true,
      })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${API}/athletes/ath-1/session-history`);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('from')).toBe('2026-08-14');
    expect(request.request.params.get('to')).toBe('2026-11-05');
    expect(request.request.params.get('status')).toBe('MISSED');
    expect(request.request.params.get('withComment')).toBe('true');
    request.flush({ content: [], page: { size: 20, number: 2, totalElements: 0, totalPages: 0 } });
  });

  it("lit le prévu / réalisé d'une séance planifiée", () => {
    let review: SessionReview | undefined;
    api.review('ps-1').subscribe((value) => (review = value));
    const request = http.expectOne(`${API}/planned-sessions/ps-1/review`);
    expect(request.request.method).toBe('GET');
    request.flush({ plannedSessionId: 'ps-1', status: 'MISSED', feedback: null, exercises: [] });
    expect(review?.status).toBe('MISSED');
  });

  it("encode l'identifiant dans l'URL", () => {
    api.review('a/b').subscribe();
    http.expectOne(`${API}/planned-sessions/a%2Fb/review`).flush({});
  });
});
