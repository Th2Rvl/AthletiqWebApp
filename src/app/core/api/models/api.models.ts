/**
 * Types de l'API Athletiq, écrits à la main d'après le contrat de l'Architecte API (#1, §5.4).
 * Ils reprennent exactement les noms des champs JSON renvoyés par les DTO Spring.
 */

export type Uuid = string;
/** Instant ISO 8601 en UTC, par exemple « 2026-10-22T08:15:30.123456Z ». */
export type IsoInstant = string;

export type Role = 'ADMIN' | 'COACH' | 'ATHLETE';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED';

/** Page renvoyée par `PagedModel` de Spring Data (sérialisation `VIA_DTO`). */
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

/** Paramètres de pagination envoyés à l'API (page en base 0). */
export interface PageQuery {
  page: number;
  size: number;
}

export interface Organisation {
  id: Uuid;
  name: string;
  description: string | null;
  coachCount: number;
  athleteCount: number;
  pendingInvitationCount: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** Corps de `POST` et `PUT /organisations` : le PUT remplace tout, une description `null` est effacée. */
export interface OrganisationPayload {
  name: string;
  description: string | null;
}

export type OrganisationSortField = 'name' | 'createdAt';

export interface OrganisationListQuery extends PageQuery {
  q?: string;
  sort?: { field: OrganisationSortField; direction: 'asc' | 'desc' };
}

export interface OrganisationCoach {
  coachId: Uuid;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: IsoInstant;
}

export interface Invitation {
  id: Uuid;
  organisationId: Uuid;
  email: string;
  status: InvitationStatus;
  /** Renseigné quand l'invitation est `ACCEPTED`. */
  coachId: Uuid | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface OrganisationAthlete {
  athleteId: Uuid;
  firstName: string;
  lastName: string;
  coaches: { coachId: Uuid; firstName: string; lastName: string }[];
}

export interface AuthUser {
  id: Uuid;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

/** Corps de `POST /auth/register` : création d'un compte coach (US06). */
export interface RegisterCoachPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Corps de `POST /auth/password/forgot` (US08). */
export interface ForgotPasswordPayload {
  email: string;
}

/**
 * Réponse à une demande de réinitialisation. `resetToken` ne porte le jeton que si l'API
 * l'expose (hors production) : en production, le parcours passe par un e-mail.
 */
export interface ForgotPasswordResponse {
  accepted: boolean;
  message: string;
  resetToken?: string | null;
}

/** Corps de `POST /auth/password/reset` (US08). */
export interface ResetPasswordPayload {
  token: string;
  password: string;
  passwordConfirmation: string;
}

/** Profil du coach connecté (US09). */
export interface CoachProfile {
  id: Uuid;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: IsoInstant;
}

/** Corps de `PATCH /profile`. Un champ absent ou `null` est inchangé. */
export interface UpdateProfilePayload {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/** Erreur au format `ProblemDetail`, enrichie de `code`, `field` et `errors` (contrat §3). */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  field?: string;
  errors?: { field: string; message: string }[];
}
