import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CoachProfile,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginResponse,
  RegisterCoachPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
} from './models/api.models';

/**
 * Accès aux endpoints de compte : inscription, réinitialisation du mot de passe et profil
 * (contrat d'API de #2).
 */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}`;

  /** US06 : crée un compte coach et renvoie la session ouverte. */
  register(payload: RegisterCoachPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/register`, payload);
  }

  /** US08 : demande de réinitialisation. La réponse ne révèle pas si le compte existe. */
  forgotPassword(payload: ForgotPasswordPayload): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.baseUrl}/auth/password/forgot`, payload);
  }

  /** US08 : change le mot de passe à partir d'un jeton. */
  resetPassword(payload: ResetPasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/password/reset`, payload);
  }

  /** US07 : déconnexion. L'API est sans état, l'appel est informatif. */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, {});
  }

  /** US09 : profil du coach connecté. */
  getProfile(): Observable<CoachProfile> {
    return this.http.get<CoachProfile>(`${this.baseUrl}/profile`);
  }

  /** US09 : modification du profil du coach connecté. */
  updateProfile(payload: UpdateProfilePayload): Observable<CoachProfile> {
    return this.http.patch<CoachProfile>(`${this.baseUrl}/profile`, payload);
  }
}
