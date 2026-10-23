import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AccountApiService } from '../../../../core/api/account-api.service';
import { problemMessage } from '../../../../core/api/api-problem';
import {
  ForgotPasswordFormComponent,
  ForgotPasswordRequest,
} from '../../organisms/forgot-password-form/forgot-password-form.component';

/**
 * Page « mot de passe oublié » (US08). L'API répond pareil que le compte existe ou non :
 * l'écran affiche le même message dans les deux cas.
 *
 * <p>Hors production, l'API renvoie le jeton : il est alors proposé dans un lien de
 * réinitialisation, faute de service d'e-mail.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ForgotPasswordFormComponent, RouterLink, ButtonModule, MessageModule],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly accountApi = inject(AccountApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly resetToken = signal<string | null>(null);

  protected requestReset(request: ForgotPasswordRequest): void {
    this.submitting.set(true);
    this.error.set(null);
    this.accountApi
      .forgotPassword(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.message.set(response.message);
          this.resetToken.set(response.resetToken ?? null);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(problemMessage(error));
        },
      });
  }

  protected goToReset(): void {
    const token = this.resetToken();
    void this.router.navigate(['/reinitialiser-mot-de-passe'], {
      queryParams: token ? { token } : {},
    });
  }
}
