import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AthleteCalendar,
  CreatedCount,
  DuplicateWeekPayload,
  GroupCalendar,
  IsoDate,
  MovePlannedSessionPayload,
  PlanSessionPayload,
  PlannedSessionDetail,
  UpcomingCount,
  Uuid,
} from './models/api.models';

/**
 * Accès aux endpoints de planification (contrat #6, §4), tous réservés au rôle COACH.
 * Les dates circulent en chaînes « AAAA-MM-JJ » : aucune conversion par `Date`.
 * Une ressource d'un autre coach répond `404` (`ATHLETE_NOT_FOUND`, `GROUP_NOT_FOUND`,
 * `PLANNED_SESSION_NOT_FOUND`), jamais `403`.
 */
@Injectable({ providedIn: 'root' })
export class PlanningApiService {
  private readonly http = inject(HttpClient);
  private readonly athletesUrl = `${environment.apiUrl}/athletes`;
  private readonly groupsUrl = `${environment.apiUrl}/groups`;
  private readonly plannedUrl = `${environment.apiUrl}/planned-sessions`;

  /** Calendrier d'un athlète, bornes incluses (84 jours au plus). */
  athleteCalendar(athleteId: Uuid, from: IsoDate, to: IsoDate): Observable<AthleteCalendar> {
    return this.http.get<AthleteCalendar>(this.athleteUrl(athleteId), {
      params: period(from, to),
    });
  }

  /** Calendrier d'un groupe : séances des membres actuels regroupées par jour et instantané. */
  groupCalendar(groupId: Uuid, from: IsoDate, to: IsoDate): Observable<GroupCalendar> {
    return this.http.get<GroupCalendar>(this.groupUrl(groupId), { params: period(from, to) });
  }

  /** `201` + détail de la séance planifiée créée. */
  planForAthlete(athleteId: Uuid, payload: PlanSessionPayload): Observable<PlannedSessionDetail> {
    return this.http.post<PlannedSessionDetail>(this.athleteUrl(athleteId), payload);
  }

  /** `201 { created }` : une séance planifiée par membre présent. */
  planForGroup(groupId: Uuid, payload: PlanSessionPayload): Observable<CreatedCount> {
    return this.http.post<CreatedCount>(this.groupUrl(groupId), payload);
  }

  get(plannedSessionId: Uuid): Observable<PlannedSessionDetail> {
    return this.http.get<PlannedSessionDetail>(this.plannedSessionUrl(plannedSessionId));
  }

  /** Déplacer : `PATCH { date }`, contenu inchangé. */
  move(plannedSessionId: Uuid, date: IsoDate): Observable<PlannedSessionDetail> {
    const payload: MovePlannedSessionPayload = { date };
    return this.http.patch<PlannedSessionDetail>(this.plannedSessionUrl(plannedSessionId), payload);
  }

  /** Annuler = suppression physique (`204`). */
  cancel(plannedSessionId: Uuid): Observable<void> {
    return this.http.delete<void>(this.plannedSessionUrl(plannedSessionId));
  }

  /** Nombre de séances à venir de ce coach pour cet athlète : supprimées s'il est retiré. */
  upcomingCount(athleteId: Uuid): Observable<UpcomingCount> {
    return this.http.get<UpcomingCount>(`${this.athleteUrl(athleteId)}/upcoming-count`);
  }

  duplicateWeekForAthlete(athleteId: Uuid, payload: DuplicateWeekPayload): Observable<CreatedCount> {
    return this.http.post<CreatedCount>(`${this.athleteUrl(athleteId)}/duplicate-week`, payload);
  }

  duplicateWeekForGroup(groupId: Uuid, payload: DuplicateWeekPayload): Observable<CreatedCount> {
    return this.http.post<CreatedCount>(`${this.groupUrl(groupId)}/duplicate-week`, payload);
  }

  private athleteUrl(athleteId: Uuid): string {
    return `${this.athletesUrl}/${encodeURIComponent(athleteId)}/planned-sessions`;
  }

  private groupUrl(groupId: Uuid): string {
    return `${this.groupsUrl}/${encodeURIComponent(groupId)}/planned-sessions`;
  }

  private plannedSessionUrl(plannedSessionId: Uuid): string {
    return `${this.plannedUrl}/${encodeURIComponent(plannedSessionId)}`;
  }
}

function period(from: IsoDate, to: IsoDate): HttpParams {
  return new HttpParams().set('from', from).set('to', to);
}
