import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoachKpis, KpiQuery } from './models/api.models';

/**
 * Accès au tableau de bord du coach (contrat #7, endpoint 7, US32), réservé au rôle COACH.
 * Les indicateurs ne comptent que les séances planifiées par ce coach, sur les 4 ou 12 semaines
 * qui finissent la veille (aujourd'hui exclu). Un groupe d'un autre coach répond
 * `404 GROUP_NOT_FOUND`, une période hors de 4 ou 12 semaines `400 INVALID_PARAMETER`.
 */
@Injectable({ providedIn: 'root' })
export class KpiApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/dashboard/kpis`;

  kpis(query: KpiQuery): Observable<CoachKpis> {
    let params = new HttpParams().set('weeks', query.weeks);
    if (query.groupId) {
      params = params.set('groupId', query.groupId);
    }
    return this.http.get<CoachKpis>(this.url, { params });
  }
}
