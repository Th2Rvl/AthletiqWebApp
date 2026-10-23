import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GroupApiService } from './group-api.service';

const BASE = `${environment.apiUrl}/groups`;

describe('GroupApiService', () => {
  let api: GroupApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(GroupApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste les groupes avec pagination', () => {
    api.list({ page: 2, size: 20 }).subscribe();
    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ content: [], page: { size: 20, number: 2, totalElements: 0, totalPages: 0 } });
  });

  it('crée un groupe', () => {
    api.create({ name: 'Sprint' }).subscribe();
    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Sprint' });
    request.flush({});
  });

  it('renomme un groupe avec PATCH', () => {
    api.rename('g-1', { name: 'Demi-fond' }).subscribe();
    const request = http.expectOne(`${BASE}/g-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Demi-fond' });
    request.flush({});
  });

  it('lit et supprime un groupe', () => {
    api.get('g-1').subscribe();
    http.expectOne(`${BASE}/g-1`).flush({});
    api.delete('g-1').subscribe();
    const request = http.expectOne(`${BASE}/g-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('liste la composition d’un groupe', () => {
    api.listMembers('g-1', { page: 0, size: 20 }).subscribe();
    const request = http.expectOne((req) => req.url === `${BASE}/g-1/athletes`);
    expect(request.request.method).toBe('GET');
    request.flush({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it('ajoute un lot d’athlètes puis en retire un', () => {
    api.addMembers('g-1', { athleteIds: ['a-1', 'a-2'] }).subscribe();
    const add = http.expectOne(`${BASE}/g-1/athletes`);
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ athleteIds: ['a-1', 'a-2'] });
    add.flush({});

    api.removeMember('g-1', 'a-1').subscribe();
    const remove = http.expectOne(`${BASE}/g-1/athletes/a-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });
});
