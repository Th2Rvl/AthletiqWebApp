import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AccountApiService } from '../../../../core/api/account-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CoachProfile } from '../../../../core/api/models/api.models';
import { ProfilePageComponent } from './profile-page.component';

const PROFILE: CoachProfile = {
  id: '7f000101-a164-1f58-81a1-645007c60000',
  email: 'claire.martin@club.fr',
  firstName: 'Claire',
  lastName: 'Martin',
  role: 'COACH',
  createdAt: '2026-10-01T08:00:00Z',
};

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let element: HTMLElement;
  let api: { getProfile: ReturnType<typeof vi.fn>; updateProfile: ReturnType<typeof vi.fn> };
  let auth: { updateProfile: ReturnType<typeof vi.fn> };

  async function setup(): Promise<void> {
    api = { getProfile: vi.fn().mockReturnValue(of(PROFILE)), updateProfile: vi.fn() };
    auth = { updateProfile: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
    fixture = TestBed.createComponent(ProfilePageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('affiche le profil du coach', async () => {
    await setup();
    expect(element.querySelector<HTMLInputElement>('#profile-email')!.value).toBe(
      'claire.martin@club.fr',
    );
    expect(element.textContent).toContain('Coach');
  });

  it('enregistre les modifications et met à jour la session', async () => {
    await setup();
    auth.updateProfile.mockReturnValue(of({ ...PROFILE, lastName: 'Martin-Ndiaye' }));

    const input = element.querySelector<HTMLInputElement>('#profile-last-name')!;
    input.value = 'Martin-Ndiaye';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();

    expect(auth.updateProfile).toHaveBeenCalledWith({
      email: 'claire.martin@club.fr',
      firstName: 'Claire',
      lastName: 'Martin-Ndiaye',
    });
    expect(element.textContent).toContain('Profil mis à jour');
  });

  it('affiche un message quand l’e-mail est déjà utilisé', async () => {
    await setup();
    auth.updateProfile.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { code: 'EMAIL_ALREADY_EXISTS' } }),
      ),
    );

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();

    expect(element.textContent).toContain('Un compte existe déjà avec cet e-mail');
  });
});
