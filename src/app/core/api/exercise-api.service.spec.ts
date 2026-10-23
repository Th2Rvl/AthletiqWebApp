import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ExercisePayload } from './models/api.models';
import { ExerciseApiService } from './exercise-api.service';

const BASE = `${environment.apiUrl}/exercises`;
const PAYLOAD: ExercisePayload = {
  name: 'Développé couché',
  description: null,
  muscleGroup: 'PECTORAUX',
  equipment: 'Barre',
  videoUrl: null,
};

describe('ExerciseApiService', () => {
  let api: ExerciseApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ExerciseApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste avec pagination, sans paramètre de recherche vide', () => {
    api.list({ page: 1, size: 20, q: '   ', equipment: '' }).subscribe();
    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('q')).toBe(false);
    expect(request.request.params.has('equipment')).toBe(false);
    request.flush({ content: [], page: { size: 20, number: 1, totalElements: 0, totalPages: 0 } });
  });

  it('envoie la recherche (q, sans espaces de bord), le groupe musculaire et le matériel', () => {
    api
      .list({ page: 0, size: 20, q: ' dév ', muscleGroup: 'DOS', equipment: ' Barre ' })
      .subscribe();
    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.params.get('q')).toBe('dév');
    expect(request.request.params.get('muscleGroup')).toBe('DOS');
    expect(request.request.params.get('equipment')).toBe('Barre');
    request.flush({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it('crée un exercice avec POST', () => {
    api.create(PAYLOAD).subscribe();
    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(PAYLOAD);
    request.flush({});
  });

  it('modifie un exercice avec PUT et envoie tous les champs', () => {
    api.update('ex-1', PAYLOAD).subscribe();
    const request = http.expectOne(`${BASE}/ex-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(PAYLOAD);
    request.flush({});
  });

  it('supprime un exercice avec DELETE', () => {
    api.delete('ex-1').subscribe();
    const request = http.expectOne(`${BASE}/ex-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
