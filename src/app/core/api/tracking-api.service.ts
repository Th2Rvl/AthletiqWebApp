import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Page,
  PerformedExercise,
  PersonalRecords,
  Progression,
  ProgressionWeeks,
  SessionHistoryItem,
  SessionHistoryQuery,
  SessionReview,
  TrackingOverview,
  Uuid,
} from './models/api.models';

/**
 * Accès aux lectures du suivi d'un athlète (contrat #7, endpoints 1 à 6), toutes réservées
 * au rôle COACH et en lecture seule (Q12). Le coach ne voit que les séances qu'il a planifiées.
 * Un athlète qui n'est plus suivi répond `404 ATHLETE_NOT_FOUND`, une séance d'un autre coach
 * `404 PLANNED_SESSION_NOT_FOUND`, un exercice d'autrui `404 EXERCISE_NOT_FOUND`, jamais `403`.
 * Les dates circulent en « AAAA-MM-JJ ».
 */
@Injectable({ providedIn: 'root' })
export class TrackingApiService {
  private readonly http = inject(HttpClient);
  private readonly athletesUrl = `${environment.apiUrl}/athletes`;
  private readonly plannedUrl = `${environment.apiUrl}/planned-sessions`;

  /** En-tête de l'écran « Suivi » : identité de l'athlète, `today` et présence d'un historique. */
  overview(athleteId: Uuid): Observable<TrackingOverview> {
    return this.http.get<TrackingOverview>(`${this.athleteUrl(athleteId)}/tracking`);
  }

  /**
   * Historique paginé des séances réalisées et non faites (US27). Un filtre absent n'est pas
   * envoyé : l'API applique alors ses valeurs par défaut (28 derniers jours, tous statuts).
   */
  history(athleteId: Uuid, query: SessionHistoryQuery): Observable<Page<SessionHistoryItem>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    if (query.from) {
      params = params.set('from', query.from);
    }
    if (query.to) {
      params = params.set('to', query.to);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.withComment) {
      params = params.set('withComment', true);
    }
    const url = `${this.athleteUrl(athleteId)}/session-history`;
    return this.http.get<Page<SessionHistoryItem>>(url, { params });
  }

  /** Prévu / réalisé et ressenti d'une séance planifiée (US28, US29). */
  review(plannedSessionId: Uuid): Observable<SessionReview> {
    return this.http.get<SessionReview>(
      `${this.plannedUrl}/${encodeURIComponent(plannedSessionId)}/review`,
    );
  }

  /** Exercices d'au moins une séance réalisée, triés par groupe musculaire puis nom (US30). */
  performedExercises(athleteId: Uuid): Observable<PerformedExercise[]> {
    return this.http.get<PerformedExercise[]>(`${this.athleteUrl(athleteId)}/performed-exercises`);
  }

  /** Progression d'un exercice sur 4, 12, 26 ou 52 semaines : un point par séance réalisée. */
  progression(athleteId: Uuid, exerciseId: Uuid, weeks: ProgressionWeeks): Observable<Progression> {
    const url = `${this.athleteUrl(athleteId)}/exercises/${encodeURIComponent(exerciseId)}/progression`;
    return this.http.get<Progression>(url, { params: new HttpParams().set('weeks', weeks) });
  }

  /** Records personnels, toutes périodes (US31). */
  personalRecords(athleteId: Uuid): Observable<PersonalRecords> {
    return this.http.get<PersonalRecords>(`${this.athleteUrl(athleteId)}/personal-records`);
  }

  private athleteUrl(athleteId: Uuid): string {
    return `${this.athletesUrl}/${encodeURIComponent(athleteId)}`;
  }
}
