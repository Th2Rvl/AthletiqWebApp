import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Role } from '../../../../core/api/models/api.models';
import { SESSION_STORAGE_KEY } from '../../../../core/auth/auth.service';
import { ShellPageComponent } from './shell-page.component';

async function render(role: Role): Promise<HTMLElement> {
  sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: 't',
      expiresAt: Date.now() + 60_000,
      user: { id: '1', email: 'x@club.fr', firstName: 'Sophie', lastName: 'Bernard', role },
    }),
  );
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  const fixture = TestBed.createComponent(ShellPageComponent);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('ShellPageComponent', () => {
  afterEach(() => sessionStorage.clear());

  it("montre l'entrée « Organisations » à un administrateur", async () => {
    const element = await render('ADMIN');
    expect(element.querySelector('nav')?.textContent).toContain('Organisations');
  });

  it("cache l'entrée « Organisations » à un coach", async () => {
    const element = await render('COACH');
    expect(element.querySelector('nav')?.textContent).not.toContain('Organisations');
    expect(element.textContent).toContain('Sophie Bernard');
  });

  it('déconnecte et renvoie vers la connexion', async () => {
    const element = await render('ADMIN');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const logout = [...element.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Se déconnecter'),
    )!;

    logout.click();

    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
