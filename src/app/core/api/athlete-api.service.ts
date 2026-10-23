import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AthleteInvitation,
  AthleteListQuery,
  AthleteSummary,
  CreateInvitationPayload,
  Page,
  PageQuery,
  Uuid,
} from './models/api.models';

/**
 * Accès aux endpoints `/invitations` et `/athletes` (contrat #3, §4.1 à 4.3, 4.5 et 4.6),
 * tous réservés au rôle COACH. La saisie du code par l'athlète (`/me/coaches`) relève de
 * l'app mobile (#47) et n'est pas appelée par le web.
 */
@Injectable({ providedIn: 'root' })
export class AthleteApiService {
  private readonly http = inject(HttpClient);
  private readonly invitationsUrl = `${environment.apiUrl}/invitations`;
  private readonly athletesUrl = `${environment.apiUrl}/athletes`;

  listInvitations(query: PageQuery): Observable<Page<AthleteInvitation>> {
    return this.http.get<Page<AthleteInvitation>>(this.invitationsUrl, {
      params: new HttpParams().set('page', query.page).set('size', query.size),
    });
  }

  createInvitation(payload: CreateInvitationPayload): Observable<AthleteInvitation> {
    return this.http.post<AthleteInvitation>(this.invitationsUrl, payload);
  }

  revokeInvitation(invitationId: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.invitationsUrl}/${encodeURIComponent(invitationId)}`);
  }

  list(query: AthleteListQuery): Observable<Page<AthleteSummary>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    const q = query.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (query.groupId) {
      params = params.set('groupId', query.groupId);
    }
    if (query.excludeGroupId) {
      params = params.set('excludeGroupId', query.excludeGroupId);
    }
    return this.http.get<Page<AthleteSummary>>(this.athletesUrl, { params });
  }

  remove(athleteId: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.athletesUrl}/${encodeURIComponent(athleteId)}`);
  }
}
