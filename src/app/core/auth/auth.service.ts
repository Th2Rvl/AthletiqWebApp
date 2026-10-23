import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountApiService } from '../api/account-api.service';
import {
  AuthUser,
  CoachProfile,
  LoginResponse,
  RegisterCoachPayload,
  UpdateProfilePayload,
} from '../api/models/api.models';

/** Session conservée dans `sessionStorage` sous la clé `athletiq.session` (contrat §7). */
export interface Session {
  accessToken: string;
  /** Date d'expiration du token, en millisecondes depuis l'époque Unix. */
  expiresAt: number;
  user: AuthUser;
}

export const SESSION_STORAGE_KEY = 'athletiq.session';
export const LOGIN_URL = `${environment.apiUrl}/auth/login`;

/**
 * Session du coach : connexion, inscription, déconnexion et profil courant.
 *
 * Le token vit en mémoire et dans `sessionStorage` : il survit à un rechargement de l'onglet
 * mais pas à sa fermeture, ce qui limite son exposition tant qu'il n'y a pas de refresh token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly accountApi = inject(AccountApiService);
  private readonly storage = storageOf(inject(DOCUMENT));
  private readonly session = signal<Session | null>(this.readSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly isCoach = computed(() => this.user()?.role === 'COACH');

  /** Vrai si une session existe et n'a pas expiré. Une session expirée est effacée. */
  isAuthenticated(): boolean {
    const session = this.session();
    if (!session) {
      return false;
    }
    if (session.expiresAt <= Date.now()) {
      this.logout();
      return false;
    }
    return true;
  }

  /** Token à envoyer dans l'en-tête `Authorization`, ou `null` sans session valide. */
  accessToken(): string | null {
    return this.isAuthenticated() ? (this.session()?.accessToken ?? null) : null;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<LoginResponse>(LOGIN_URL, { email, password }).pipe(
      map((response) => ({
        accessToken: response.accessToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
        user: response.user,
      })),
      tap((session) => this.saveSession(session)),
      map((session) => session.user),
    );
  }

  /**
   * US06 : crée un compte coach et ouvre la session. L'API renvoie directement le jeton,
   * le coach n'a pas à se reconnecter juste après s'être inscrit.
   */
  register(payload: RegisterCoachPayload): Observable<AuthUser> {
    return this.accountApi.register(payload).pipe(
      map((response) => ({
        accessToken: response.accessToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
        user: response.user,
      })),
      tap((session) => this.saveSession(session)),
      map((session) => session.user),
    );
  }

  /**
   * US09 : met à jour le profil puis la session locale. Le JWT ne porte ni l'e-mail ni le nom,
   * il reste donc valable : seule la session affichée change.
   */
  updateProfile(payload: UpdateProfilePayload): Observable<CoachProfile> {
    return this.accountApi.updateProfile(payload).pipe(
      tap((profile) => {
        const current = this.session();
        if (current) {
          this.saveSession({ ...current, user: this.toAuthUser(profile) });
        }
      }),
    );
  }

  /** US07 : ferme la session. L'effacement est local et immédiat : il ne dépend pas du réseau. */
  logout(): void {
    this.session.set(null);
    try {
      this.storage?.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Stockage indisponible : la session en mémoire est déjà effacée.
    }
  }

  /** US07 : prévient l'API de la déconnexion. L'appel est informatif, la session est déjà fermée. */
  notifyLogout(): Observable<void> {
    return this.accountApi.logout();
  }

  private toAuthUser(profile: CoachProfile): AuthUser {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
    };
  }

  private saveSession(session: Session): void {
    this.session.set(session);
    try {
      this.storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Stockage indisponible (navigation privée) : la session ne vaut que pour cet onglet ouvert.
    }
  }

  private readSession(): Session | null {
    try {
      const raw = this.storage?.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const session = JSON.parse(raw) as Session;
      const valid =
        typeof session?.accessToken === 'string' &&
        typeof session.expiresAt === 'number' &&
        session.expiresAt > Date.now() &&
        typeof session.user?.role === 'string';
      return valid ? session : null;
    } catch {
      return null;
    }
  }
}

function storageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
