import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Exercise, ExerciseListQuery, ExercisePayload, Page, Uuid } from './models/api.models';

/**
 * Accès à l'endpoint `/exercises` (contrat #4), réservé au rôle COACH. La bibliothèque est
 * propre à chaque coach : l'API ne renvoie que les exercices du coach connecté.
 * La recherche par nom et les filtres passent par `GET /exercises` (pas de sous-ressource).
 */
@Injectable({ providedIn: 'root' })
export class ExerciseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/exercises`;

  list(query: ExerciseListQuery): Observable<Page<Exercise>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    const q = query.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (query.muscleGroup) {
      params = params.set('muscleGroup', query.muscleGroup);
    }
    const equipment = query.equipment?.trim();
    if (equipment) {
      params = params.set('equipment', equipment);
    }
    return this.http.get<Page<Exercise>>(this.baseUrl, { params });
  }

  create(payload: ExercisePayload): Observable<Exercise> {
    return this.http.post<Exercise>(this.baseUrl, payload);
  }

  /** `PUT` : remplace l'exercice entier, donc tous les champs du formulaire sont envoyés. */
  update(exerciseId: Uuid, payload: ExercisePayload): Observable<Exercise> {
    return this.http.put<Exercise>(this.url(exerciseId), payload);
  }

  delete(exerciseId: Uuid): Observable<void> {
    return this.http.delete<void>(this.url(exerciseId));
  }

  private url(exerciseId: Uuid): string {
    return `${this.baseUrl}/${encodeURIComponent(exerciseId)}`;
  }
}
