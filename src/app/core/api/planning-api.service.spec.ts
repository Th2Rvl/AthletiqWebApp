import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import {
  AthleteCalendar,
  GroupCalendar,
  PlannedSessionDetail,
} from './models/api.models';
import { PlanningApiService } from './planning-api.service';

const API = environment.apiUrl;
const DETAIL: PlannedSessionDetail = {
  id: 'ps-1',
  athleteId: 'ath-1',
  athleteFirstName: 'Lucas',
  athleteLastName: 'Durand',
  date: '2026-11-12',
  groupId: null,
  sourceWorkoutId: 'w-1',
  locked: false,
  name: 'Haut du corps A',
  description: null,
  exercises: [],
  createdAt: '2026-10-23T08:15:30.123456Z',
  updatedAt: '2026-10-23T08:15:30.123456Z',
};

describe('PlanningApiService', () => {
  let api: PlanningApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PlanningApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("lit le calendrier d'un athlète avec from et to en chaînes AAAA-MM-JJ", () => {
    let calendar: AthleteCalendar | undefined;
    api.athleteCalendar('ath-1', '2026-11-02', '2026-11-29').subscribe((value) => (calendar = value));
    const request = http.expectOne((req) => req.url === `${API}/athletes/ath-1/planned-sessions`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-11-02');
    expect(request.request.params.get('to')).toBe('2026-11-29');
    const body: AthleteCalendar = {
      athleteId: 'ath-1',
      from: '2026-11-02',
      to: '2026-11-29',
      today: '2026-11-05',
      sessions: [],
    };
    request.flush(body);
    expect(calendar).toEqual(body);
  });

  it("lit le calendrier d'un groupe", () => {
    let calendar: GroupCalendar | undefined;
    api.groupCalendar('g-1', '2026-11-02', '2026-11-29').subscribe((value) => (calendar = value));
    const request = http.expectOne((req) => req.url === `${API}/groups/g-1/planned-sessions`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-11-02');
    expect(request.request.params.get('to')).toBe('2026-11-29');
    request.flush({ groupId: 'g-1', from: 'x', to: 'y', today: 'z', memberCount: 4, entries: [] });
    expect(calendar?.memberCount).toBe(4);
  });

  it('planifie pour un athlète avec POST { workoutId, date }', () => {
    let created: PlannedSessionDetail | undefined;
    api
      .planForAthlete('ath-1', { workoutId: 'w-1', date: '2026-11-12' })
      .subscribe((value) => (created = value));
    const request = http.expectOne(`${API}/athletes/ath-1/planned-sessions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ workoutId: 'w-1', date: '2026-11-12' });
    request.flush(DETAIL, { status: 201, statusText: 'Created' });
    expect(created?.id).toBe('ps-1');
  });

  it('planifie pour un groupe, sans skipConflicts, et lit le nombre créé', () => {
    let created = -1;
    api
      .planForGroup('g-1', { workoutId: 'w-1', date: '2026-11-12' })
      .subscribe((value) => (created = value.created));
    const request = http.expectOne(`${API}/groups/g-1/planned-sessions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ workoutId: 'w-1', date: '2026-11-12' });
    request.flush({ created: 3 }, { status: 201, statusText: 'Created' });
    expect(created).toBe(3);
  });

  it('lit le détail, déplace avec PATCH { date } et annule avec DELETE', () => {
    api.get('ps-1').subscribe();
    const read = http.expectOne(`${API}/planned-sessions/ps-1`);
    expect(read.request.method).toBe('GET');
    read.flush(DETAIL);

    api.move('ps-1', '2026-11-19').subscribe();
    const moved = http.expectOne(`${API}/planned-sessions/ps-1`);
    expect(moved.request.method).toBe('PATCH');
    expect(moved.request.body).toEqual({ date: '2026-11-19' });
    moved.flush({ ...DETAIL, date: '2026-11-19' });

    api.cancel('ps-1').subscribe();
    const cancelled = http.expectOne(`${API}/planned-sessions/ps-1`);
    expect(cancelled.request.method).toBe('DELETE');
    cancelled.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('lit le nombre de séances à venir avant le retrait d’un athlète', () => {
    let count = -1;
    api.upcomingCount('ath-1').subscribe((value) => (count = value.count));
    const request = http.expectOne(`${API}/athletes/ath-1/planned-sessions/upcoming-count`);
    expect(request.request.method).toBe('GET');
    request.flush({ count: 4 });
    expect(count).toBe(4);
  });

  it('duplique une semaine pour un athlète et pour un groupe', () => {
    api.duplicateWeekForAthlete('ath-1', { weekStart: '2026-11-09', weeks: 3 }).subscribe();
    const athlete = http.expectOne(`${API}/athletes/ath-1/planned-sessions/duplicate-week`);
    expect(athlete.request.method).toBe('POST');
    expect(athlete.request.body).toEqual({ weekStart: '2026-11-09', weeks: 3 });
    athlete.flush({ created: 9 }, { status: 201, statusText: 'Created' });

    api.duplicateWeekForGroup('g-1', { weekStart: '2026-11-09', weeks: 1 }).subscribe();
    const group = http.expectOne(`${API}/groups/g-1/planned-sessions/duplicate-week`);
    expect(group.request.method).toBe('POST');
    expect(group.request.body).toEqual({ weekStart: '2026-11-09', weeks: 1 });
    group.flush({ created: 4 }, { status: 201, statusText: 'Created' });
  });

  it("encode les identifiants dans l'URL", () => {
    api.get('a/b').subscribe();
    http.expectOne(`${API}/planned-sessions/a%2Fb`).flush(DETAIL);
  });
});
