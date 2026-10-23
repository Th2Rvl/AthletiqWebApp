import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AddGroupMembersPayload,
  Group,
  GroupMember,
  GroupNamePayload,
  Page,
  PageQuery,
  Uuid,
} from './models/api.models';

/** Accès aux endpoints `/groups` (contrat #3, §4.7 à 4.14), tous réservés au rôle COACH. */
@Injectable({ providedIn: 'root' })
export class GroupApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/groups`;

  list(query: PageQuery): Observable<Page<Group>> {
    return this.http.get<Page<Group>>(this.baseUrl, { params: pageParams(query) });
  }

  get(groupId: Uuid): Observable<Group> {
    return this.http.get<Group>(this.url(groupId));
  }

  create(payload: GroupNamePayload): Observable<Group> {
    return this.http.post<Group>(this.baseUrl, payload);
  }

  rename(groupId: Uuid, payload: GroupNamePayload): Observable<Group> {
    return this.http.patch<Group>(this.url(groupId), payload);
  }

  delete(groupId: Uuid): Observable<void> {
    return this.http.delete<void>(this.url(groupId));
  }

  listMembers(groupId: Uuid, query: PageQuery): Observable<Page<GroupMember>> {
    return this.http.get<Page<GroupMember>>(`${this.url(groupId)}/athletes`, {
      params: pageParams(query),
    });
  }

  addMembers(groupId: Uuid, payload: AddGroupMembersPayload): Observable<Group> {
    return this.http.post<Group>(`${this.url(groupId)}/athletes`, payload);
  }

  removeMember(groupId: Uuid, athleteId: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.url(groupId)}/athletes/${encodeURIComponent(athleteId)}`);
  }

  private url(groupId: Uuid): string {
    return `${this.baseUrl}/${encodeURIComponent(groupId)}`;
  }
}

function pageParams(query: PageQuery): HttpParams {
  return new HttpParams().set('page', query.page).set('size', query.size);
}
