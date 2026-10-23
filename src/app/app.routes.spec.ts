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
});
