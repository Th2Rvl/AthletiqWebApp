import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { SignupPageComponent } from './signup-page.component';

describe('SignupPageComponent', () => {
  let fixture: ComponentFixture<SignupPageComponent>;
  let element: HTMLElement;
  let auth: { register: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(): Promise<void> {
    auth = { register: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(SignupPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function fill(values: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(values)) {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
  }

  const COMPLETE = {
    '#signup-first-name': 'Claire',
    '#signup-last-name': 'Martin',
    '#signup-email': 'Claire.Martin@Club.FR',
    '#signup-password': 'motdepasse123',
    '#signup-password-confirmation': 'motdepasse123',
  };

  it('inscrit le coach et le connecte', async () => {
    await setup();
    auth.register.mockReturnValue(of({ role: 'COACH' }));

    await fill(COMPLETE);
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();

    expect(auth.register).toHaveBeenCalledWith({
      email: 'claire.martin@club.fr',
      password: 'motdepasse123',
      firstName: 'Claire',
      lastName: 'Martin',
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it("affiche un message quand l'e-mail est déjà utilisé", async () => {
    await setup();
    auth.register.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { code: 'EMAIL_ALREADY_EXISTS' } }),
      ),
    );

    await fill(COMPLETE);
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();

    expect(element.textContent).toContain('Un compte existe déjà avec cet e-mail');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refuse deux mots de passe différents sans appeler l’API', async () => {
    await setup();

    await fill({ ...COMPLETE, '#signup-password-confirmation': 'autremotdepasse456' });
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();

    expect(auth.register).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Les deux mots de passe ne correspondent pas');
  });
});
