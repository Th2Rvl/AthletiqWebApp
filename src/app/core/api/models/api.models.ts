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

/**
 * Invitation d'athlète en attente (#3, contrat §4.1). Nommée `AthleteInvitation` et non
 * `Invitation` (nom du contrat) pour ne pas la confondre avec l'invitation de coach à une
 * organisation, déjà modélisée ci-dessus.
 */
export interface AthleteInvitation {
  id: Uuid;
  label: string;
  /** 8 caractères sans tiret ; l'affichage « XXXX-XXXX » est fait par le front. */
  code: string;
  expiresAt: IsoInstant;
  createdAt: IsoInstant;
}

export interface CreateInvitationPayload {
  label: string;
}

export interface GroupRef {
  id: Uuid;
  name: string;
}

/** Athlète suivi par le coach connecté ; `groups` ne contient que les groupes de ce coach. */
export interface AthleteSummary {
  id: Uuid;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: IsoInstant;
  groups: GroupRef[];
}

export interface AthleteListQuery extends PageQuery {
  q?: string;
  groupId?: Uuid;
  excludeGroupId?: Uuid;
}

export interface Group {
  id: Uuid;
  name: string;
  athleteCount: number;
  createdAt: IsoInstant;
}

/** Corps de `POST /groups` et `PATCH /groups/{id}`. */
export interface GroupNamePayload {
  name: string;
}

export interface GroupMember {
  athleteId: Uuid;
  firstName: string;
  lastName: string;
  email: string;
  addedAt: IsoInstant;
}

export interface AddGroupMembersPayload {
  athleteIds: Uuid[];
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
  /** `409 EXERCISE_IN_USE` (contrat #5, §8) : nombre de séances qui utilisent l'exercice. */
  workoutCount?: number;
  /** `409 EXERCISE_IN_USE` (contrat #6, §8) : nombre de séances planifiées qui l'utilisent. */
  plannedSessionCount?: number;
}

/** Groupes musculaires figés côté API (contrat #4, ajustement du 23/10) : liste fermée. */
export type MuscleGroup =
  | 'PECTORAUX'
  | 'DOS'
  | 'EPAULES'
  | 'BICEPS'
  | 'TRICEPS'
  | 'AVANT_BRAS'
  | 'ABDOMINAUX'
  | 'QUADRICEPS'
  | 'ISCHIO_JAMBIERS'
  | 'FESSIERS'
  | 'MOLLETS'
  | 'CORPS_ENTIER';

/** Exercice de la bibliothèque du coach connecté (US15 à US17). */
export interface Exercise {
  id: Uuid;
  name: string;
  description: string | null;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  videoUrl: string | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** Corps de `POST /exercises` et `PUT /exercises/{id}` : le PUT remplace tout, un champ `null` est effacé. */
export interface ExercisePayload {
  name: string;
  description: string | null;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  videoUrl: string | null;
}

/** Paramètres de `GET /exercises` : recherche par nom (`q`) et filtres (contrat #4, ajustements). */
export interface ExerciseListQuery extends PageQuery {
  q?: string;
  muscleGroup?: MuscleGroup;
  equipment?: string;
}

/** Exercice tel que référencé dans une séance (contrat #5, §5) : identité et groupe musculaire. */
export interface ExerciseRef {
  id: Uuid;
  name: string;
  muscleGroup: MuscleGroup;
}

/** Série prévue : `loadKg` `null` = poids du corps, `restSeconds` `null` = repos non précisé. */
export interface PlannedSet {
  position: number;
  reps: number;
  loadKg: number | null;
  restSeconds: number | null;
}

/** Exercice d'une séance, sans `id` exposé : le `PUT` recrée les exercices et leurs séries. */
export interface WorkoutExercise {
  position: number;
  exercise: ExerciseRef;
  note: string | null;
  sets: PlannedSet[];
}

/** Séance du coach (US18 à US20) : exercices et séries triés par `position`. */
export interface Workout {
  id: Uuid;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** Élément de la liste des séances. `muscleGroups` est distinct, dans l'ordre de l'enum. */
export interface WorkoutSummary {
  id: Uuid;
  name: string;
  description: string | null;
  exerciseCount: number;
  muscleGroups: MuscleGroup[];
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** Série envoyée : sa position est son index dans la liste. */
export interface PlannedSetPayload {
  reps: number;
  loadKg: number | null;
  restSeconds: number | null;
}

/** Exercice envoyé : sa position est son index dans la liste ; un même exercice peut revenir. */
export interface WorkoutExercisePayload {
  exerciseId: Uuid;
  note: string | null;
  sets: PlannedSetPayload[];
}

/** Corps de `POST /workouts` et `PUT /workouts/{id}` (remplacement complet de la séance). */
export interface WorkoutPayload {
  name: string;
  description: string | null;
  exercises: WorkoutExercisePayload[];
}

/** Paramètres de `GET /workouts` : recherche par nom ; le tri est fixe (modification décroissante). */
export interface WorkoutListQuery extends PageQuery {
  q?: string;
}

// --- Planification (contrat #6, §5 et §10) ---

/** Jour sans heure « AAAA-MM-JJ ». Jamais converti via `new Date()` en UTC (décalage d'un jour). */
export type IsoDate = string;

/**
 * Statut de lecture d'une séance planifiée (contrat #7) : `DONE` = réalisation validée par
 * l'athlète, quelle que soit la date ; `MISSED` = date passée sans réalisation validée ;
 * `UPCOMING` sinon. Un brouillon de l'athlète n'est jamais `DONE`.
 */
export type SessionStatus = 'UPCOMING' | 'DONE' | 'MISSED';

/**
 * Séance planifiée dans le calendrier d'un athlète. `name` est celui de l'instantané ;
 * `locked` (passée ou réalisée, #7) masque Déplacer et Annuler.
 */
export interface PlannedSessionSummary {
  id: Uuid;
  athleteId: Uuid;
  date: IsoDate;
  name: string;
  exerciseCount: number;
  setCount: number;
  groupId: Uuid | null;
  locked: boolean;
  status: SessionStatus;
}

/** `GET /athletes/{id}/planned-sessions` : `today` est « aujourd'hui » à Paris, donné par l'API. */
export interface AthleteCalendar {
  athleteId: Uuid;
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  /** Triées par date ; plusieurs séances le même jour sont normales (décision du PO, Q1). */
  sessions: PlannedSessionSummary[];
}

export interface GroupCalendarSession {
  id: Uuid;
  athleteId: Uuid;
  firstName: string;
  lastName: string;
  status: SessionStatus;
}

/** Séances d'un même instantané le même jour : « Haut du corps A, 3/4 athlètes ». */
export interface GroupCalendarEntry {
  date: IsoDate;
  snapshotId: Uuid;
  name: string;
  /** n : membres actuels qui ont cette séance ce jour-là. */
  athleteCount: number;
  /** N : membres actuels du groupe. */
  memberCount: number;
  locked: boolean;
  sessions: GroupCalendarSession[];
}

export interface GroupCalendar {
  groupId: Uuid;
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  memberCount: number;
  entries: GroupCalendarEntry[];
}

/** Détail d'une séance planifiée : l'instantané copié du modèle, exercices de même forme que #5. */
export interface PlannedSessionDetail {
  id: Uuid;
  athleteId: Uuid;
  athleteFirstName: string;
  athleteLastName: string;
  date: IsoDate;
  groupId: Uuid | null;
  sourceWorkoutId: Uuid | null;
  locked: boolean;
  status: SessionStatus;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** Corps de `POST /athletes/{id}/planned-sessions` et `POST /groups/{id}/planned-sessions`. */
export interface PlanSessionPayload {
  workoutId: Uuid;
  date: IsoDate;
}

/** Corps de `PATCH /planned-sessions/{id}` (déplacer). */
export interface MovePlannedSessionPayload {
  date: IsoDate;
}

/** Corps de `POST …/planned-sessions/duplicate-week` : `weekStart` est un lundi, 1 à 12 semaines. */
export interface DuplicateWeekPayload {
  weekStart: IsoDate;
  weeks: number;
}

export interface CreatedCount {
  created: number;
}

export interface UpcomingCount {
  count: number;
}

// --- Suivi (contrat #7, lot 1 : endpoints 1 à 3) ---

/** `GET /athletes/{id}/tracking` : en-tête de l'écran « Suivi ». */
export interface TrackingOverview {
  athleteId: Uuid;
  firstName: string;
  lastName: string;
  today: IsoDate;
  /** Vrai si au moins une séance de ce coach est réalisée ou non faite, toutes périodes. */
  hasPastSessions: boolean;
}

/** Statuts listés dans l'historique : réalisées et non faites (Q11). */
export type PastSessionStatus = Exclude<SessionStatus, 'UPCOMING'>;

/** Ligne de `GET /athletes/{id}/session-history` (US27, US29). Champs absents = `null`. */
export interface SessionHistoryItem {
  plannedSessionId: Uuid;
  date: IsoDate;
  name: string;
  status: PastSessionStatus;
  /** 1 à 10, `null` = non renseigné (jamais 0). */
  rpe: number | null;
  /** 1 à 5, `null` = non renseignée. */
  fatigue: number | null;
  hasComment: boolean;
  validatedAt: IsoInstant | null;
  correctedAt: IsoInstant | null;
}

/**
 * Paramètres de l'historique : `from` et `to` inclus (défaut : les 28 jours qui finissent
 * aujourd'hui, 364 jours d'écart au plus), `status` absent = les deux, tri fixe date décroissante.
 */
export interface SessionHistoryQuery extends PageQuery {
  from?: IsoDate;
  to?: IsoDate;
  status?: PastSessionStatus;
  withComment?: boolean;
}

/** Ressenti d'une séance réalisée (US29), `null` hors `DONE`. */
export interface SessionFeedback {
  rpe: number | null;
  fatigue: number | null;
  comment: string | null;
  /** Première validation par l'athlète. */
  validatedAt: IsoInstant;
  /** Dernière correction après validation, source de « Modifiée le … ». */
  correctedAt: IsoInstant | null;
}

/**
 * Série prévue (lue dans l'instantané) et son réalisé. Hors `DONE`, tout le réalisé est `null`
 * et `done` faux. `loadDeltaKg` est `null` dès qu'une des deux charges est vide.
 */
export interface ReviewedSet {
  snapshotSetId: Uuid;
  position: number;
  plannedReps: number;
  plannedLoadKg: number | null;
  restSeconds: number | null;
  done: boolean;
  performedReps: number | null;
  performedLoadKg: number | null;
  repsDelta: number | null;
  loadDeltaKg: number | null;
}

/**
 * Exercice de la séance : volumes (Σ répétitions × charge) en kg, `null` au poids du corps ;
 * `volumeDeltaPercent` entier, `null` si le volume prévu est `null` ou nul.
 */
export interface ReviewedExercise {
  snapshotExerciseId: Uuid;
  exerciseId: Uuid;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  position: number;
  note: string | null;
  /** Toutes les charges prévues sont vides. */
  bodyweight: boolean;
  plannedVolumeKg: number | null;
  performedVolumeKg: number | null;
  volumeDeltaPercent: number | null;
  sets: ReviewedSet[];
}

/** `GET /planned-sessions/{id}/review` : prévu / réalisé et ressenti (US28, US29). */
export interface SessionReview {
  plannedSessionId: Uuid;
  athleteId: Uuid;
  athleteFirstName: string;
  athleteLastName: string;
  date: IsoDate;
  today: IsoDate;
  name: string;
  description: string | null;
  status: SessionStatus;
  feedback: SessionFeedback | null;
  exercises: ReviewedExercise[];
}

// --- Suivi (contrat #7, lot 2 : endpoints 4 à 7) ---

/** Exercice réalisé au moins une fois par l'athlète dans une séance de ce coach (US30). */
export interface PerformedExercise {
  exerciseId: Uuid;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sessionCount: number;
  lastPerformedOn: IsoDate;
}

/** Périodes de la progression, en semaines (12 par défaut). */
export type ProgressionWeeks = 4 | 12 | 26 | 52;

/** Une séance réalisée de l'exercice ; plusieurs occurrences dans la séance sont agrégées. */
export interface ProgressionPoint {
  plannedSessionId: Uuid;
  date: IsoDate;
  /** `null` si aucune série chargée dans la séance. */
  maxLoadKg: number | null;
  maxReps: number;
  /** Σ répétitions × charge des séries réalisées chargées, `null` au poids du corps. */
  volumeKg: number | null;
}

/** `GET /athletes/{id}/exercises/{exerciseId}/progression?weeks=` (US30). */
export interface Progression {
  athleteId: Uuid;
  exerciseId: Uuid;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  /** Aucune série réalisée chargée sur la période : on suit les répétitions max. */
  bodyweight: boolean;
  weeks: ProgressionWeeks;
  from: IsoDate;
  today: IsoDate;
  /** Triés par date croissante ; vide si l'exercice n'a pas été réalisé sur la période. */
  points: ProgressionPoint[];
}

/**
 * Record personnel d'un exercice (US31) : meilleure charge réalisée et répétitions de cette
 * série ; au poids du corps (`bodyweight`, `loadKg` `null`), le maximum de répétitions.
 */
export interface PersonalRecord {
  exerciseId: Uuid;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  bodyweight: boolean;
  loadKg: number | null;
  reps: number;
  date: IsoDate;
  plannedSessionId: Uuid;
}

/** `GET /athletes/{id}/personal-records`, trié par groupe musculaire puis nom. */
export interface PersonalRecords {
  athleteId: Uuid;
  records: PersonalRecord[];
}

/** Périodes du tableau de bord, en semaines (4 par défaut). */
export type KpiWeeks = 4 | 12;

export interface KpiQuery {
  weeks: KpiWeeks;
  groupId?: Uuid | null;
}

/** Agrégats du coach sur la période ; taux et RPE moyen `null` sans séance passée. */
export interface KpiTotals {
  athleteCount: number;
  doneCount: number;
  missedCount: number;
  /** Entier, réalisées / (réalisées + non faites). */
  completionRate: number | null;
  /** Une décimale, sur les séances réalisées avec RPE. */
  averageRpe: number | null;
}

export interface AthleteKpi {
  athleteId: Uuid;
  firstName: string;
  lastName: string;
  doneCount: number;
  missedCount: number;
  completionRate: number | null;
  averageRpe: number | null;
  missedLast7Days: number;
  watch: boolean;
}

/** Motif d'alerte : non faite récente, ou taux de réalisation sous le seuil. */
export type WatchReason = 'MISSED_RECENTLY' | 'LOW_COMPLETION';

export interface WatchlistEntry {
  athleteId: Uuid;
  firstName: string;
  lastName: string;
  missedCount: number;
  missedLast7Days: number;
  completionRate: number | null;
  reasons: WatchReason[];
}

/**
 * `GET /dashboard/kpis` (US32) : période `[from, to]` = les `weeks` semaines qui finissent
 * la veille de `today` (aujourd'hui exclu).
 */
export interface CoachKpis {
  today: IsoDate;
  from: IsoDate;
  to: IsoDate;
  weeks: KpiWeeks;
  groupId: Uuid | null;
  totals: KpiTotals;
  /** Triés par nom puis prénom, athlètes sans séance compris. */
  athletes: AthleteKpi[];
  /** « À surveiller », triés par nombre de non faites décroissant. */
  watchlist: WatchlistEntry[];
}
