import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, LOGIN_URL } from './auth.service';

/**
 * Ajoute le token aux requêtes vers l'API et traite les refus d'accès (contrat §7) :
 * - 401 (hors connexion) : la session est effacée et l'utilisateur renvoyé vers `/login` ;
 * - 403 : l'utilisateur est renvoyé vers la page « Accès refusé ».
 * L'erreur est toujours propagée, pour que l'appelant arrête son chargement.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApiCall = request.url.startsWith(environment.apiUrl);
  const isLogin = request.url === LOGIN_URL;
  if (!isApiCall || isLogin) {
    return next(request);
  }

  const token = auth.accessToken();
  const authorized = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          auth.logout();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        } else if (error.status === 403) {
          void router.navigate(['/acces-refuse']);
        }
      }
      return throwError(() => error);
    }),
  );
};
