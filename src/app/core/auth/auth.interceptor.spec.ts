import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService, LOGIN_URL, SESSION_STORAGE_KEY } from './auth.service';

const API = `${environment.apiUrl}/organisations`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: 'token-admin',
        expiresAt: Date.now() + 60_000,
        user: { id: '1', email: 'a@b.fr', firstName: 'A', lastName: 'B', role: 'ADMIN' },
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    controller.verify();
    sessionStorage.clear();
  });

  it("ajoute le token aux appels de l'API", () => {
    http.get(API).subscribe();
    const request = controller.expectOne(API);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-admin');
    request.flush({});
  });

  it("n'ajoute pas le token à la connexion ni aux autres domaines", () => {
    http.post(LOGIN_URL, {}).subscribe();
    http.get('https://example.org/data').subscribe();
    expect(controller.expectOne(LOGIN_URL).request.headers.has('Authorization')).toBe(false);
    expect(
      controller.expectOne('https://example.org/data').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('efface la session et renvoie vers la connexion sur un 401', () => {
    const errors: unknown[] = [];
    http.get(API).subscribe({ error: (error) => errors.push(error) });
    controller.expectOne(API).flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: '' });

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], expect.anything());
    expect(errors).toHaveLength(1);
  });

  it('renvoie vers la page « Accès refusé » sur un 403', () => {
    http.get(API).subscribe({ error: () => undefined });
    controller.expectOne(API).flush({ code: 'ACCESS_DENIED' }, { status: 403, statusText: '' });

    expect(router.navigate).toHaveBeenCalledWith(['/acces-refuse']);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
  });

  it('laisse la page de connexion traiter un 401 sur identifiants refusés', () => {
    http.post(LOGIN_URL, {}).subscribe({ error: () => undefined });
    controller
      .expectOne(LOGIN_URL)
      .flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: '' });
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
