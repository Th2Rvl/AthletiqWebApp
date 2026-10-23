import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountApiService } from '../../../../core/api/account-api.service';
import { problemMessage } from '../../../../core/api/api-problem';
import {
  NewPassword,
  ResetPasswordFormComponent,
} from '../../organisms/reset-password-form/reset-password-form.component';

/**
 * Page de choix d'un nouveau mot de passe (US08). Le jeton vient de l'URL : il porte le
 * lien envoyé au coach.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ResetPasswordFormComponent, RouterLink, ButtonModule, MessageModule],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  private readonly accountApi = inject(AccountApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected reset(newPassword: NewPassword): void {
    const token = this.token();
    if (!token) {
      this.error.set('Ce lien de réinitialisation ne contient pas de jeton valide.');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.accountApi
      .resetPassword({ token, ...newPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.done.set(true);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(problemMessage(error));
        },
      });
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  private token(): string | null {
    return this.route.snapshot.queryParamMap.get('token');
  }
}
