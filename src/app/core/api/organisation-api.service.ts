import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Invitation,
  InvitationStatus,
  Organisation,
  OrganisationAthlete,
  OrganisationCoach,
  OrganisationListQuery,
  OrganisationPayload,
  Page,
  PageQuery,
  Uuid,
} from './models/api.models';

/** Accès aux endpoints `/organisations` (E1 à E12 du contrat), tous réservés au rôle ADMIN. */
@Injectable({ providedIn: 'root' })
export class OrganisationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/organisations`;

  list(query: OrganisationListQuery): Observable<Page<Organisation>> {
    let params = pageParams(query);
    const q = query.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (query.sort) {
      params = params.set('sort', `${query.sort.field},${query.sort.direction}`);
    }
    return this.http.get<Page<Organisation>>(this.baseUrl, { params });
  }

  get(organisationId: Uuid): Observable<Organisation> {
    return this.http.get<Organisation>(this.url(organisationId));
  }

  create(payload: OrganisationPayload): Observable<Organisation> {
    return this.http.post<Organisation>(this.baseUrl, payload);
  }

  update(organisationId: Uuid, payload: OrganisationPayload): Observable<Organisation> {
    return this.http.put<Organisation>(this.url(organisationId), payload);
  }

  delete(organisationId: Uuid): Observable<void> {
    return this.http.delete<void>(this.url(organisationId));
  }

  listCoaches(organisationId: Uuid, query: PageQuery): Observable<Page<OrganisationCoach>> {
    return this.http.get<Page<OrganisationCoach>>(`${this.url(organisationId)}/coaches`, {
      params: pageParams(query),
    });
  }

  removeCoach(organisationId: Uuid, coachId: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.url(organisationId)}/coaches/${coachId}`);
  }

  inviteCoach(organisationId: Uuid, email: string): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.url(organisationId)}/invitations`, { email });
  }

  listInvitations(
    organisationId: Uuid,
    query: PageQuery,
    status: InvitationStatus = 'PENDING',
  ): Observable<Page<Invitation>> {
    return this.http.get<Page<Invitation>>(`${this.url(organisationId)}/invitations`, {
      params: pageParams(query).set('status', status),
    });
  }

  cancelInvitation(organisationId: Uuid, invitationId: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.url(organisationId)}/invitations/${invitationId}`);
  }

  listAthletes(organisationId: Uuid, query: PageQuery): Observable<Page<OrganisationAthlete>> {
    return this.http.get<Page<OrganisationAthlete>>(`${this.url(organisationId)}/athletes`, {
      params: pageParams(query),
    });
  }

  private url(organisationId: Uuid): string {
    return `${this.baseUrl}/${encodeURIComponent(organisationId)}`;
  }
}

function pageParams(query: PageQuery): HttpParams {
  return new HttpParams().set('page', query.page).set('size', query.size);
}
