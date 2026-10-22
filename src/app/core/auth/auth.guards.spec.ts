import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Role } from '../api/models/api.models';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { SESSION_STORAGE_KEY } from './auth.service';

function signIn(role: Role): void {
  sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: 't',
      expiresAt: Date.now() + 60_000,
      user: { id: '1', email: 'x@club.fr', firstName: 'Claire', lastName: 'Martin', role },
    }),
  );
}

function run(guard: typeof adminGuard, url = '/organisations'): boolean | UrlTree {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

function serialize(result: boolean | UrlTree): string | boolean {
  return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
}

describe('guards', () => {
  afterEach(() => sessionStorage.clear());

  describe('adminGuard', () => {
    it('laisse passer un administrateur', () => {
      signIn('ADMIN');
      expect(run(adminGuard)).toBe(true);
    });

    it('renvoie un coach vers la page « Accès refusé »', () => {
      signIn('COACH');
      expect(serialize(run(adminGuard))).toBe('/acces-refuse');
    });

    it('renvoie un visiteur non connecté vers la connexion, avec l’URL demandée', () => {
      expect(serialize(run(adminGuard, '/organisations/42'))).toBe(
        '/login?returnUrl=%2Forganisations%2F42',
      );
    });
  });

  describe('authGuard', () => {
    it('exige une session', () => {
      expect(serialize(run(authGuard, '/'))).toBe('/login?returnUrl=%2F');
    });

    it('laisse passer un athlète connecté', () => {
      signIn('ATHLETE');
      expect(run(authGuard)).toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('renvoie un utilisateur connecté vers l’accueil', () => {
      signIn('ADMIN');
      expect(serialize(run(guestGuard, '/login'))).toBe('/');
    });

    it('affiche la connexion sans session', () => {
      expect(run(guestGuard, '/login')).toBe(true);
    });
  });
});
