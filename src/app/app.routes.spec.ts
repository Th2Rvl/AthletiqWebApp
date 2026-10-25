import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { routes } from './app.routes';

@Component({ template: '' })
class StubPageComponent {}

/**
 * Les routes de l'app, gardes et redirections comprises, où chaque page chargée à la demande
 * est remplacée par un composant vide. Ces tests vérifient où le routeur arrive, pas les
 * pages : sans ce remplacement, la première navigation importait la coquille et la liste des
 * athlètes (PrimeNG compris), ce qui dépassait le délai de 5 s sur une machine chargée.
 */
function withStubPages(source: Routes): Routes {
  return source.map(({ loadComponent, children, ...route }) => ({
    ...route,
    ...(loadComponent ? { component: StubPageComponent } : {}),
    ...(children ? { children: withStubPages(children) } : {}),
  }));
}

function signedInAs(role: 'COACH' | 'ADMIN'): Router {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(withStubPages(routes)),
      {
        provide: AuthService,
        useValue: {
          isAuthenticated: () => true,
          isCoach: () => role === 'COACH',
          isAdmin: () => role === 'ADMIN',
        },
      },
    ],
  });
  return TestBed.inject(Router);
}

describe('routes', () => {
  it('redirige un coach de / vers /tableau-de-bord (#7, Q15)', async () => {
    const router = signedInAs('COACH');

    await router.navigateByUrl('/');

    expect(router.url).toBe('/tableau-de-bord');
  });

  it('réserve le tableau de bord au coach : un administrateur arrive sur « Accès refusé »', async () => {
    const router = signedInAs('ADMIN');

    await router.navigateByUrl('/tableau-de-bord');

    expect(router.url).toBe('/acces-refuse');
  });

  it('redirige un administrateur de / vers /organisations', async () => {
    const router = signedInAs('ADMIN');

    await router.navigateByUrl('/');

    expect(router.url).toBe('/organisations');
  });

  it('réserve /seances au coach : un administrateur arrive sur « Accès refusé »', async () => {
    const router = signedInAs('ADMIN');

    await router.navigateByUrl('/seances/nouvelle');

    expect(router.url).toBe('/acces-refuse');
  });

  it('réserve /planning au coach : un administrateur arrive sur « Accès refusé »', async () => {
    const router = signedInAs('ADMIN');

    await router.navigateByUrl('/planning/athletes/ath-1?debut=2026-11-02');

    expect(router.url).toBe('/acces-refuse');
  });

  it('réserve le suivi au coach : un administrateur arrive sur « Accès refusé » (#7)', async () => {
    const router = signedInAs('ADMIN');

    await router.navigateByUrl('/athletes/ath-1/suivi');
    expect(router.url).toBe('/acces-refuse');

    await router.navigateByUrl('/athletes/ath-1/seances/ps-1');
    expect(router.url).toBe('/acces-refuse');
  });

  it('ouvre le suivi et la séance d’un athlète pour un coach (Q15)', async () => {
    const router = signedInAs('COACH');

    await router.navigateByUrl('/athletes/ath-1/suivi?onglet=historique');
    expect(router.url).toBe('/athletes/ath-1/suivi?onglet=historique');

    await router.navigateByUrl('/athletes/ath-1/seances/ps-1');
    expect(router.url).toBe('/athletes/ath-1/seances/ps-1');
  });

  it('déclare les trois routes du planning sous la même page', () => {
    const planning = routes
      .flatMap((route) => route.children ?? [])
      .find((route) => route.path === 'planning')!;

    expect(planning.canActivate?.length).toBe(1);
    expect(planning.children!.map((route) => route.path)).toEqual([
      '',
      'athletes/:athleteId',
      'groupes/:groupId',
    ]);
  });

  it("protège l'éditeur de séance par la garde de sortie", () => {
    const seances = routes
      .flatMap((route) => route.children ?? [])
      .find((route) => route.path === 'seances')!;
    const editors = seances.children!.filter((route) => route.path !== '');

    expect(editors.map((route) => route.path)).toEqual(['nouvelle', ':workoutId']);
    for (const route of editors) {
      expect(route.canDeactivate?.length).toBe(1);
    }
  });
});
