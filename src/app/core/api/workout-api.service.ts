import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Page,
  Uuid,
  Workout,
  WorkoutListQuery,
  WorkoutPayload,
  WorkoutSummary,
} from './models/api.models';

/**
 * Accès à l'endpoint `/workouts` (contrat #5), réservé au rôle COACH. Une séance est propre
 * au coach : celle d'un autre coach répond `404 WORKOUT_NOT_FOUND`, jamais `403`.
 * Le réordonnancement n'a pas d'endpoint : l'ordre est celui des listes envoyées au `PUT`.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/workouts`;

  /** Liste paginée, triée par date de modification décroissante (tri fixe côté API). */
  list(query: WorkoutListQuery): Observable<Page<WorkoutSummary>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    const q = query.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Page<WorkoutSummary>>(this.baseUrl, { params });
  }

  get(workoutId: Uuid): Observable<Workout> {
    return this.http.get<Workout>(this.url(workoutId));
  }

  create(payload: WorkoutPayload): Observable<Workout> {
    return this.http.post<Workout>(this.baseUrl, payload);
  }

  /** `PUT` : remplace la séance entière, exercices et séries compris, dans l'ordre envoyé. */
  update(workoutId: Uuid, payload: WorkoutPayload): Observable<Workout> {
    return this.http.put<Workout>(this.url(workoutId), payload);
  }

  /** Copie profonde, nommée « <nom> (copie) » par l'API ; renvoie la copie. */
  duplicate(workoutId: Uuid): Observable<Workout> {
    return this.http.post<Workout>(`${this.url(workoutId)}/duplicate`, null);
  }

  delete(workoutId: Uuid): Observable<void> {
    return this.http.delete<void>(this.url(workoutId));
  }

  private url(workoutId: Uuid): string {
    return `${this.baseUrl}/${encodeURIComponent(workoutId)}`;
  }
}
