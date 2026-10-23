import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Organisation, Page } from './models/api.models';
import { OrganisationApiService } from './organisation-api.service';

const BASE = `${environment.apiUrl}/organisations`;
const ORG_ID = '1f0b6c2e-8a51-6d3e-9c1a-3b0e4f5a6b7c';

describe('OrganisationApiService', () => {
  let api: OrganisationApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(OrganisationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste les organisations avec pagination, recherche et tri', () => {
    const page: Page<Organisation> = {
      content: [],
      page: { size: 20, number: 1, totalElements: 21, totalPages: 2 },
    };
    let result: Page<Organisation> | undefined;

    api
      .list({ page: 1, size: 20, q: '  rennes ', sort: { field: 'createdAt', direction: 'desc' } })
      .subscribe((value) => (result = value));

    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('q')).toBe('rennes');
    expect(request.request.params.get('sort')).toBe('createdAt,desc');
    request.flush(page);
    expect(result).toEqual(page);
  });

  it("n'envoie pas de recherche vide", () => {
    api.list({ page: 0, size: 20, q: '   ' }).subscribe();
    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.params.has('q')).toBe(false);
    expect(request.request.params.has('sort')).toBe(false);
    request.flush({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it('crée une organisation', () => {
    api.create({ name: 'Stade Rennais Athlétisme', description: null }).subscribe();
    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Stade Rennais Athlétisme', description: null });
    request.flush({});
  });

  it('modifie une organisation par remplacement complet', () => {
    api.update(ORG_ID, { name: 'Trail Club du Morbihan', description: null }).subscribe();
    const request = http.expectOne(`${BASE}/${ORG_ID}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Trail Club du Morbihan', description: null });
    request.flush({});
  });

  it('supprime une organisation', () => {
    api.delete(ORG_ID).subscribe();
    const request = http.expectOne(`${BASE}/${ORG_ID}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('liste les coachs, les athlètes et les invitations en attente', () => {
    api.listCoaches(ORG_ID, { page: 0, size: 20 }).subscribe();
    api.listAthletes(ORG_ID, { page: 2, size: 10 }).subscribe();
    api.listInvitations(ORG_ID, { page: 0, size: 20 }).subscribe();

    const coaches = http.expectOne((req) => req.url === `${BASE}/${ORG_ID}/coaches`);
    expect(coaches.request.params.get('page')).toBe('0');
    const athletes = http.expectOne((req) => req.url === `${BASE}/${ORG_ID}/athletes`);
    expect(athletes.request.params.get('page')).toBe('2');
    expect(athletes.request.params.get('size')).toBe('10');
    const invitations = http.expectOne((req) => req.url === `${BASE}/${ORG_ID}/invitations`);
    expect(invitations.request.params.get('status')).toBe('PENDING');

    const empty = { content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } };
    coaches.flush(empty);
    athletes.flush(empty);
    invitations.flush(empty);
  });

  it('invite un coach par e-mail', () => {
    api.inviteCoach(ORG_ID, 'coach@club.fr').subscribe();
    const request = http.expectOne(`${BASE}/${ORG_ID}/invitations`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'coach@club.fr' });
    request.flush({});
  });

  it('retire un coach et annule une invitation', () => {
    api.removeCoach(ORG_ID, 'coach-1').subscribe();
    api.cancelInvitation(ORG_ID, 'invitation-1').subscribe();

    expect(http.expectOne(`${BASE}/${ORG_ID}/coaches/coach-1`).request.method).toBe('DELETE');
    expect(http.expectOne(`${BASE}/${ORG_ID}/invitations/invitation-1`).request.method).toBe(
      'DELETE',
    );
  });
});
