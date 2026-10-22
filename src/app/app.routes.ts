import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';
import { AuthService } from './core/auth/auth.service';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion · Athletiq',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/pages/shell-page/shell-page.component').then(
        (m) => m.ShellPageComponent,
      ),
    children: [
      {
        // Pas encore d'accueil coach : l'administrateur arrive sur ses organisations.
        path: '',
        pathMatch: 'full',
        redirectTo: () => (inject(AuthService).isAdmin() ? '/organisations' : '/acces-refuse'),
      },
      {
        path: 'organisations',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            title: 'Organisations · Athletiq',
            loadComponent: () =>
              import('./features/organisations/pages/organisation-list-page/organisation-list-page.component').then(
                (m) => m.OrganisationListPageComponent,
              ),
          },
          {
            path: ':organisationId',
            title: 'Organisation · Athletiq',
            loadComponent: () =>
              import('./features/organisations/pages/organisation-detail-page/organisation-detail-page.component').then(
                (m) => m.OrganisationDetailPageComponent,
              ),
          },
        ],
      },
      {
        path: 'acces-refuse',
        title: 'Accès refusé · Athletiq',
        loadComponent: () =>
          import('./features/auth/pages/access-denied-page/access-denied-page.component').then(
            (m) => m.AccessDeniedPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
