import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';

/**
 * Page « Accès refusé » : un compte authentifié sans le rôle requis (RM10), ou un 403 de l'API.
 * Propose de changer de compte, seule action utile tant que l'app coach n'a pas d'autre écran.
 */
@Component({
  selector: 'app-access-denied-page',
  imports: [EmptyStateComponent],
  template: `
    <h1 class="page-title">Accès refusé</h1>
    <app-empty-state
      message="Votre compte n'a pas accès à cette page."
      detail="La gestion des organisations est réservée aux administrateurs de la plateforme."
      actionLabel="Se connecter avec un autre compte"
      (action)="switchAccount()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected switchAccount(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
