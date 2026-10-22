import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { problemMessage } from '../../../../core/api/api-problem';
import { AuthService } from '../../../../core/auth/auth.service';
import { Credentials, LoginFormComponent } from '../../organisms/login-form/login-form.component';

/** Page de connexion. Après succès, retour à l'URL demandée (`returnUrl`) ou à l'accueil. */
@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected login(credentials: Credentials): void {
    this.submitting.set(true);
    this.error.set(null);
    this.auth
      .login(credentials.email, credentials.password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl(this.returnUrl());
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(problemMessage(error));
        },
      });
  }

  /** N'accepte qu'un chemin interne, pour ne jamais rediriger vers un autre site. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
      ? url
      : '/';
  }
}
