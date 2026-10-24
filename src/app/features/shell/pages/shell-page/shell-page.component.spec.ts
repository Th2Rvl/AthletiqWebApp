import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Role } from '../../../../core/api/models/api.models';
import { SESSION_STORAGE_KEY } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { ShellPageComponent } from './shell-page.component';

@Component({ template: '' })
class BlankComponent {}

async function render(role: Role): Promise<HTMLElement> {
  sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: 't',
      expiresAt: Date.now() + 60_000,
      user: { id: '1', email: 'x@club.fr', firstName: 'Sophie', lastName: 'Bernard', role },
    }),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'athletes', component: BlankComponent },
        { path: 'groupes', component: BlankComponent },
        { path: 'planning', component: BlankComponent },
      ]),
      provideHttpClient(),
    ],
  });
  const fixture = TestBed.createComponent(ShellPageComponent);
  await fixture.whenStable();
  return fixture.nativeElement;
}

function mainNav(element: HTMLElement): string {
  return element.querySelector('nav[aria-label="Navigation principale"]')?.textContent ?? '';
}

describe('ShellPageComponent', () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.classList.remove('ath-dark');
  });

  it("montre l'entrée « Organisations » à un administrateur, sans aucune entrée du coach", async () => {
    const element = await render('ADMIN');
    expect(element.querySelector('nav[aria-label="Compte"]')?.textContent).toContain(
      'Organisations',
    );
    expect(element.querySelector('nav[aria-label="Navigation principale"]')).toBeNull();
    expect(element.textContent).not.toContain('Exercices');
    expect(element.textContent).not.toContain('Séances');
    expect(element.textContent).not.toContain('Planification');
    expect(element.textContent).not.toContain('Athlètes et groupes');
  });

  it("cache l'entrée « Organisations » à un coach et montre son nom", async () => {
    const element = await render('COACH');
    expect(element.textContent).not.toContain('Organisations');
    expect(element.textContent).toContain('Sophie Bernard');
  });

  it('montre les entrées de la planche à un coach, avec leurs icônes', async () => {
    const element = await render('COACH');
    const nav = mainNav(element);
    expect(nav).toContain('Athlètes et groupes');
    expect(nav).toContain('Exercices');
    expect(nav).toContain('Séances');
    expect(nav).toContain('Planification');
    expect(nav).not.toContain('Tableau de bord');
    expect(
      element.querySelectorAll('nav[aria-label="Navigation principale"] ion-icon'),
    ).toHaveLength(4);
  });

  it('montre « Mon profil » et « Se déconnecter » dans le pied de barre', async () => {
    const account = (await render('COACH')).querySelector('nav[aria-label="Compte"]')?.textContent;
    expect(account).toContain('Mon profil');
    expect(account).toContain('Se déconnecter');
  });

  it('marque « Athlètes et groupes » active (aria-current) sur les écrans des groupes', async () => {
    const element = await render('COACH');
    await TestBed.inject(Router).navigateByUrl('/groupes');
    TestBed.tick();

    const active = element.querySelector('[aria-current="page"]');
    expect(active?.textContent).toContain('Athlètes et groupes');
  });

  it('marque « Planification » active sur le planning', async () => {
    const element = await render('COACH');
    await TestBed.inject(Router).navigateByUrl('/planning');
    TestBed.tick();

    expect(element.querySelector('[aria-current="page"]')?.textContent).toContain('Planification');
  });

  it('change de thème aussitôt et retient le choix', async () => {
    const element = await render('COACH');
    const theme = TestBed.inject(ThemeService);
    const dark = element.querySelector<HTMLElement>('[aria-label="Sombre"], [data-p-value="dark"]');
    const buttons = [...element.querySelectorAll<HTMLElement>('.shell__theme button, .shell__theme [role="button"]')];
    const target = dark ?? buttons.find((button) => button.textContent?.includes('Sombre'))!;

    target.click();
    TestBed.tick();

    expect(theme.preference()).toBe('dark');
    expect(document.documentElement.classList.contains('ath-dark')).toBe(true);
    expect(localStorage.getItem('athletiq.theme')).toBe('dark');
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
