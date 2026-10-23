import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AthleteApiService } from './athlete-api.service';
import { AthleteInvitation, AthleteSummary, Page } from './models/api.models';

const ATHLETE_ID = '1f0b6c2e-8a51-6d3e-9c1a-3b0e4f5a6b7c';

describe('AthleteApiService', () => {
  let api: AthleteApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AthleteApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste les invitations en attente avec pagination', () => {
    const page: Page<AthleteInvitation> = {
      content: [],
      page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
    };
    let result: Page<AthleteInvitation> | undefined;

    api.listInvitations({ page: 0, size: 20 }).subscribe((value) => (result = value));

    const request = http.expectOne((req) => req.url === `${environment.apiUrl}/invitations`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('size')).toBe('20');
    request.flush(page);
    expect(result).toEqual(page);
  });

  it('crée une invitation avec le libellé de l’athlète', () => {
    api.createInvitation({ label: 'Lucas Girard' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/invitations`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ label: 'Lucas Girard' });
    request.flush({}, { status: 201, statusText: 'Created' });
  });

  it('révoque une invitation', () => {
    api.revokeInvitation('inv-1').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/invitations/inv-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('liste les athlètes avec recherche et filtres, sans paramètre vide', () => {
    const page: Page<AthleteSummary> = {
      content: [],
      page: { size: 20, number: 1, totalElements: 21, totalPages: 2 },
    };
    api.list({ page: 1, size: 20, q: '  mar ', groupId: 'g-1' }).subscribe();

    const request = http.expectOne((req) => req.url === `${environment.apiUrl}/athletes`);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('q')).toBe('mar');
    expect(request.request.params.get('groupId')).toBe('g-1');
    expect(request.request.params.has('excludeGroupId')).toBe(false);
    request.flush(page);

    api.list({ page: 0, size: 100, q: ' ', excludeGroupId: 'g-2' }).subscribe();
    const second = http.expectOne((req) => req.url === `${environment.apiUrl}/athletes`);
    expect(second.request.params.has('q')).toBe(false);
    expect(second.request.params.get('excludeGroupId')).toBe('g-2');
    second.flush(page);
  });

  it('retire un athlète', () => {
    api.remove(ATHLETE_ID).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/athletes/${ATHLETE_ID}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
