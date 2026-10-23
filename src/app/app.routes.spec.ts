import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { routes } from './app.routes';

function signedInAs(role: 'COACH' | 'ADMIN'): Router {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
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
  it('redirige un coach de / vers /athletes', async () => {
    const router = signedInAs('COACH');

    await router.navigateByUrl('/');

    expect(router.url).toBe('/athletes');
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
