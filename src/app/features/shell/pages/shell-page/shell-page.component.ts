import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../../core/auth/auth.service';

/**
 * Cadre des écrans connectés : barre de navigation et zone de contenu.
 * C'est une page (composant routé) : elle lit l'utilisateur courant dans `AuthService`.
 * L'entrée « Organisations » n'est affichée qu'à un administrateur (RM10).
 * Il porte aussi les toasts et la boîte de confirmation partagés par les pages : chargés avec
 * lui, ils restent hors du bundle initial de la page de connexion.
 */
@Component({
  selector: 'app-shell-page',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  // Fournis ici et non à la racine : les pages affichées dans le cadre les injectent.
  providers: [MessageService, ConfirmationService],
  templateUrl: './shell-page.component.html',
  styleUrl: './shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly isAdmin = this.auth.isAdmin;

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
