import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let element: HTMLElement;
  let auth: { login: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(returnUrl: string | null): Promise<void> {
    auth = { login: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function submit(email: string, password: string): Promise<void> {
    for (const [selector, value] of [
      ['#login-email', email],
      ['#login-password', password],
    ]) {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it("revient à l'URL demandée après connexion", async () => {
    await setup('/organisations/org-1');
    auth.login.mockReturnValue(of({ role: 'ADMIN' }));

    await submit('Admin@Athletiq.fr', 'Mot-de-passe-2026');

    expect(auth.login).toHaveBeenCalledWith('admin@athletiq.fr', 'Mot-de-passe-2026');
    expect(navigate).toHaveBeenCalledWith('/organisations/org-1');
  });

  it('ignore une URL de retour externe', async () => {
    await setup('//exemple.org');
    auth.login.mockReturnValue(of({ role: 'ADMIN' }));
    await submit('admin@athletiq.fr', 'Mot-de-passe-2026');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('affiche « E-mail ou mot de passe incorrect » sur un refus', async () => {
    await setup(null);
    auth.login.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 401, error: { code: 'INVALID_CREDENTIALS' } }),
      ),
    );

    await submit('admin@athletiq.fr', 'mauvais');

    expect(element.textContent).toContain('E-mail ou mot de passe incorrect');
    expect(navigate).not.toHaveBeenCalled();
  });
});
