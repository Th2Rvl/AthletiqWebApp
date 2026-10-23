import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AccountApiService } from './account-api.service';

const BASE = `${environment.apiUrl}`;

describe('AccountApiService', () => {
  let api: AccountApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AccountApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("inscrit un compte coach sur POST /auth/register", () => {
    api
      .register({ email: 'claire.martin@club.fr', password: 'motdepasse123', firstName: 'Claire', lastName: 'Martin' })
      .subscribe();
    const request = http.expectOne(`${BASE}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'claire.martin@club.fr',
      password: 'motdepasse123',
      firstName: 'Claire',
      lastName: 'Martin',
    });
    request.flush({});
  });

  it('demande la réinitialisation sur POST /auth/password/forgot', () => {
    api.forgotPassword({ email: 'coach@club.fr' }).subscribe();
    const request = http.expectOne(`${BASE}/auth/password/forgot`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'coach@club.fr' });
    request.flush({ accepted: true, message: 'ok' });
  });

  it('change le mot de passe sur POST /auth/password/reset', () => {
    api.resetPassword({ token: 'jeton', password: 'nouveaumotdepasse1', passwordConfirmation: 'nouveaumotdepasse1' }).subscribe();
    const request = http.expectOne(`${BASE}/auth/password/reset`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.token).toBe('jeton');
    request.flush(null);
  });

  it('lit le profil sur GET /profile', () => {
    api.getProfile().subscribe();
    const request = http.expectOne(`${BASE}/profile`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('modifie le profil sur PATCH /profile', () => {
    api.updateProfile({ firstName: 'Claire' }).subscribe();
    const request = http.expectOne(`${BASE}/profile`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ firstName: 'Claire' });
    request.flush({});
  });
});
