import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { problemMessage } from '../../../../core/api/api-problem';
import { AuthService } from '../../../../core/auth/auth.service';
import { SignupCredentials, SignupFormComponent } from '../../organisms/signup-form/signup-form.component';

/**
 * Page de création de compte (US06). Le compte créé est connecté : le coach arrive
 * directement sur l'application.
 */
@Component({
  selector: 'app-signup-page',
  imports: [SignupFormComponent, RouterLink, ButtonModule, MessageModule],
  templateUrl: './signup-page.component.html',
  styleUrl: './signup-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected register(credentials: SignupCredentials): void {
    this.submitting.set(true);
    this.error.set(null);
    this.auth
      .register(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(problemMessage(error));
        },
      });
  }
}
