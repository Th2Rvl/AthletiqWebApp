import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ThemePreference, ThemeService } from '../../../../core/theme/theme.service';

const SUBSET: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  fragment: 'ignored',
  matrixParams: 'ignored',
};

/**
 * Cadre des écrans connectés (planche W1 à W5) : barre latérale à gauche avec la marque, la
 * navigation du coach, puis en pied le nom de l'utilisateur, ses liens de compte
 * (« Organisations » pour l'administrateur, « Mon profil », « Se déconnecter ») et le réglage
 * du thème (Système, Clair, Sombre, §7 de la charte).
 *
 * C'est une page (composant routé) : elle lit l'utilisateur dans `AuthService` et règle le
 * thème avec `ThemeService`. La navigation principale n'est affichée qu'à un coach (RM10).
 * « Athlètes et groupes » couvre `/athletes` et `/groupes`. Le nom de l'organisation, absent
 * de l'API, n'est pas affiché sous la marque (décision de l'Architecte API, #70).
 * Il porte aussi les toasts et la boîte de confirmation partagés par les pages : chargés avec
 * lui, ils restent hors du bundle initial de la page de connexion.
 */
@Component({
  selector: 'app-shell-page',
  imports: [
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmDialogModule,
    SelectButtonModule,
    ToastModule,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // Fournis ici et non à la racine : les pages affichées dans le cadre les injectent.
  providers: [MessageService, ConfirmationService],
  templateUrl: './shell-page.component.html',
  styleUrl: './shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly user = this.auth.user;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly isCoach = this.auth.isCoach;
  protected readonly theme = this.themeService.preference;

  protected readonly themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'system', label: 'Système', icon: 'desktop-outline' },
    { value: 'light', label: 'Clair', icon: 'sunny-outline' },
    { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** « Athlètes et groupes » est active sur les écrans des athlètes comme sur ceux des groupes. */
  protected readonly athletesActive = computed(() => {
    this.url();
    return (
      this.router.isActive('/athletes', SUBSET) || this.router.isActive('/groupes', SUBSET)
    );
  });

  protected setTheme(preference: ThemePreference | null): void {
    if (preference) {
      this.themeService.setPreference(preference);
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
