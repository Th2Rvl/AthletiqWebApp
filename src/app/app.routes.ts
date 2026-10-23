import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard, authGuard, coachGuard, guestGuard } from './core/auth/auth.guards';
import { AuthService } from './core/auth/auth.service';
import { unsavedChangesGuard } from './core/navigation/unsaved-changes.guard';

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
    path: 'inscription',
    title: 'Créer un compte · Athletiq',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/signup-page/signup-page.component').then(
        (m) => m.SignupPageComponent,
      ),
  },
  {
    path: 'mot-de-passe-oublie',
    title: 'Mot de passe oublié · Athletiq',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password-page/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent,
      ),
  },
  {
    path: 'reinitialiser-mot-de-passe',
    title: 'Nouveau mot de passe · Athletiq',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/reset-password-page/reset-password-page.component').then(
        (m) => m.ResetPasswordPageComponent,
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
        // Accueil par rôle : le coach arrive sur ses athlètes (jusqu'au tableau de bord, #43),
        // l'administrateur sur ses organisations.
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const auth = inject(AuthService);
          if (auth.isCoach()) {
            return '/athletes';
          }
          return auth.isAdmin() ? '/organisations' : '/acces-refuse';
        },
      },
      {
        path: 'athletes',
        title: 'Athlètes · Athletiq',
        canActivate: [coachGuard],
        loadComponent: () =>
          import('./features/athletes/pages/athlete-list-page/athlete-list-page.component').then(
            (m) => m.AthleteListPageComponent,
          ),
      },
      {
        path: 'exercices',
        title: 'Exercices · Athletiq',
        canActivate: [coachGuard],
        loadComponent: () =>
          import('./features/exercises/pages/exercise-list-page/exercise-list-page.component').then(
            (m) => m.ExerciseListPageComponent,
          ),
      },
      {
        path: 'seances',
        canActivate: [coachGuard],
        children: [
          {
            path: '',
            title: 'Séances · Athletiq',
            loadComponent: () =>
              import('./features/workouts/pages/workout-list-page/workout-list-page.component').then(
                (m) => m.WorkoutListPageComponent,
              ),
          },
          {
            path: 'nouvelle',
            title: 'Nouvelle séance · Athletiq',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/workouts/pages/workout-editor-page/workout-editor-page.component').then(
                (m) => m.WorkoutEditorPageComponent,
              ),
          },
          {
            path: ':workoutId',
            title: 'Séance · Athletiq',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/workouts/pages/workout-editor-page/workout-editor-page.component').then(
                (m) => m.WorkoutEditorPageComponent,
              ),
          },
        ],
      },
      {
        path: 'groupes',
        canActivate: [coachGuard],
        children: [
          {
            path: '',
            title: 'Groupes · Athletiq',
            loadComponent: () =>
              import('./features/groups/pages/group-list-page/group-list-page.component').then(
                (m) => m.GroupListPageComponent,
              ),
          },
          {
            path: ':groupId',
            title: 'Groupe · Athletiq',
            loadComponent: () =>
              import('./features/groups/pages/group-detail-page/group-detail-page.component').then(
                (m) => m.GroupDetailPageComponent,
              ),
          },
        ],
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
        path: 'profil',
        title: 'Mon profil · Athletiq',
        loadComponent: () =>
          import('./features/profile/pages/profile-page/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
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
