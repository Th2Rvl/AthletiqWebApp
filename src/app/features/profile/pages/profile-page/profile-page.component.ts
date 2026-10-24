import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountApiService } from '../../../../core/api/account-api.service';
import { problemMessage } from '../../../../core/api/api-problem';
import { AuthService } from '../../../../core/auth/auth.service';
import { CoachProfile } from '../../../../core/api/models/api.models';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import {
  ProfileChanges,
  ProfileFormComponent,
} from '../../organisms/profile-form/profile-form.component';

/**
 * Page « Mon profil » (US09) : lecture et modification des informations du coach connecté.
 * Affichée dans le `<main>` du cadre : elle n'en ouvre pas un second (#70).
 */
@Component({
  selector: 'app-profile-page',
  imports: [ErrorStateComponent, MessageModule, PageHeaderComponent, ProfileFormComponent, SkeletonModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  private readonly accountApi = inject(AccountApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profile = signal<CoachProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected save(changes: ProfileChanges): void {
    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);
    this.auth
      .updateProfile(changes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.submitting.set(false);
          this.profile.set(profile);
          this.success.set('Profil mis à jour');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(problemMessage(error));
        },
      });
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.load();
  }

  private load(): void {
    this.accountApi
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.loading.set(false);
          this.profile.set(profile);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(problemMessage(error));
        },
      });
  }
}
