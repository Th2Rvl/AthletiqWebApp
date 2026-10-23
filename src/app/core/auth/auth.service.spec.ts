import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoginResponse } from '../api/models/api.models';
import { AuthService, LOGIN_URL, SESSION_STORAGE_KEY, Session } from './auth.service';

const ADMIN = {
  id: '1f0b6c2e-0000-6000-8000-000000000001',
  email: 'admin@athletiq.fr',
  firstName: 'Admin',
  lastName: 'Athletiq',
  role: 'ADMIN' as const,
};

function setup(): { auth: AuthService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  beforeEach(() => sessionStorage.clear());

  it('ouvre une session à la connexion et la mémorise', () => {
    const { auth, http } = setup();
    const response: LoginResponse = {
      accessToken: 'token-admin',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: ADMIN,
    };

    auth.login('admin@athletiq.fr', 'mot-de-passe-solide').subscribe();
    const request = http.expectOne(LOGIN_URL);
    expect(request.request.body).toEqual({
      email: 'admin@athletiq.fr',
      password: 'mot-de-passe-solide',
    });
    request.flush(response);

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
    expect(auth.accessToken()).toBe('token-admin');
    const stored = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!) as Session;
    expect(stored.user.email).toBe('admin@athletiq.fr');
    expect(stored.expiresAt).toBeGreaterThan(Date.now() + 890_000);
  });

  it('relit une session valide au démarrage', () => {
    const session: Session = { accessToken: 't', expiresAt: Date.now() + 60_000, user: ADMIN };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    const { auth } = setup();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.firstName).toBe('Admin');
  });

  it('traite une session expirée comme une déconnexion', () => {
    const session: Session = { accessToken: 't', expiresAt: Date.now() - 1, user: ADMIN };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    const { auth } = setup();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('ignore une session illisible', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{pas du json');
    expect(setup().auth.isAuthenticated()).toBe(false);
  });

  it('efface la session à la déconnexion', () => {
    const session: Session = { accessToken: 't', expiresAt: Date.now() + 60_000, user: ADMIN };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    const { auth } = setup();

    auth.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('ne considère pas un coach comme administrateur', () => {
    const session: Session = {
      accessToken: 't',
      expiresAt: Date.now() + 60_000,
      user: { ...ADMIN, role: 'COACH' },
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    expect(setup().auth.isAdmin()).toBe(false);
  });
});
