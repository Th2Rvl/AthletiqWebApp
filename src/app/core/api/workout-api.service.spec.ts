import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Workout, WorkoutPayload } from './models/api.models';
import { WorkoutApiService } from './workout-api.service';

const BASE = `${environment.apiUrl}/workouts`;
const PAYLOAD: WorkoutPayload = {
  name: 'Haut du corps A',
  description: null,
  exercises: [
    {
      exerciseId: 'ex-1',
      note: 'Tempo 3-1-1',
      sets: [
        { reps: 8, loadKg: 62.5, restSeconds: 90 },
        { reps: 6, loadKg: null, restSeconds: null },
      ],
    },
  ],
};
const WORKOUT: Workout = {
  id: 'w-1',
  name: 'Haut du corps A',
  description: null,
  exercises: [],
  createdAt: '2026-10-23T08:15:30.123456Z',
  updatedAt: '2026-10-23T08:15:30.123456Z',
};

describe('WorkoutApiService', () => {
  let api: WorkoutApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WorkoutApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste avec pagination, sans recherche vide ni paramètre de tri', () => {
    api.list({ page: 2, size: 20, q: '  ' }).subscribe();
    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('q')).toBe(false);
    expect(request.request.params.has('sort')).toBe(false);
    request.flush({ content: [], page: { size: 20, number: 2, totalElements: 0, totalPages: 0 } });
  });

  it('envoie la recherche par nom sans espaces de bord', () => {
    let total = -1;
    api.list({ page: 0, size: 20, q: ' haut ' }).subscribe((page) => (total = page.page.totalElements));
    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.params.get('q')).toBe('haut');
    request.flush({ content: [], page: { size: 20, number: 0, totalElements: 42, totalPages: 3 } });
    expect(total).toBe(42);
  });

  it('lit une séance avec GET', () => {
    let read: Workout | undefined;
    api.get('w-1').subscribe((workout) => (read = workout));
    const request = http.expectOne(`${BASE}/w-1`);
    expect(request.request.method).toBe('GET');
    request.flush(WORKOUT);
    expect(read).toEqual(WORKOUT);
  });

  it('crée une séance avec POST, positions implicites (ordre des listes)', () => {
    api.create(PAYLOAD).subscribe();
    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(PAYLOAD);
    expect(JSON.stringify(request.request.body)).not.toContain('position');
    request.flush(WORKOUT, { status: 201, statusText: 'Created' });
  });

  it('remplace une séance avec PUT', () => {
    api.update('w-1', PAYLOAD).subscribe();
    const request = http.expectOne(`${BASE}/w-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(PAYLOAD);
    request.flush(WORKOUT);
  });

  it('duplique une séance avec POST sans corps', () => {
    let copy: Workout | undefined;
    api.duplicate('w-1').subscribe((workout) => (copy = workout));
    const request = http.expectOne(`${BASE}/w-1/duplicate`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ ...WORKOUT, id: 'w-2', name: 'Haut du corps A (copie)' });
    expect(copy?.id).toBe('w-2');
  });

  it('supprime une séance avec DELETE', () => {
    api.delete('w-1').subscribe();
    const request = http.expectOne(`${BASE}/w-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it("encode l'identifiant dans l'URL", () => {
    api.get('a/b').subscribe();
    http.expectOne(`${BASE}/a%2Fb`).flush(WORKOUT);
  });
});
