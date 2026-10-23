import { HttpErrorResponse } from '@angular/common/http';
import { fieldErrors, problemCode, problemMessage } from './api-problem';
import { ApiProblem } from './models/api.models';

function httpError(status: number, problem?: Partial<ApiProblem>): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: problem ?? null });
}

describe('api-problem', () => {
  it('choisit le message d’après le code et non d’après le detail', () => {
    const error = httpError(409, {
      code: 'ORGANISATION_NAME_TAKEN',
      detail: 'texte serveur',
      field: 'name',
    });
    expect(problemCode(error)).toBe('ORGANISATION_NAME_TAKEN');
    expect(fieldErrors(error)).toEqual({ name: 'Une organisation porte déjà ce nom' });
  });

  it('reprend les erreurs de validation champ par champ', () => {
    const error = httpError(400, {
      code: 'VALIDATION_FAILED',
      errors: [
        { field: 'name', message: 'Le nom doit contenir entre 2 et 100 caractères' },
        { field: 'description', message: 'La description ne doit pas dépasser 500 caractères' },
      ],
    });
    expect(fieldErrors(error)).toEqual({
      name: 'Le nom doit contenir entre 2 et 100 caractères',
      description: 'La description ne doit pas dépasser 500 caractères',
    });
  });

  it('signale un serveur injoignable', () => {
    expect(problemMessage(httpError(0))).toContain('Le serveur ne répond pas');
  });

  it('a un message par défaut pour une erreur inconnue', () => {
    expect(problemMessage(httpError(500, { code: 'INTERNAL_ERROR' }))).toContain(
      'erreur inattendue',
    );
    expect(fieldErrors(new Error('boom'))).toEqual({});
  });
});

describe('api-problem : séances (#5)', () => {
  it('distingue EXERCISE_IN_USE (avec workoutCount) du nom d’exercice déjà pris', () => {
    const inUse = httpError(409, { code: 'EXERCISE_IN_USE', detail: 'x', workoutCount: 3 });
    expect(problemMessage(inUse)).toBe('Cet exercice est utilisé dans 3 séances');
    expect(problemMessage(httpError(409, { code: 'EXERCISE_IN_USE', workoutCount: 1 }))).toBe(
      'Cet exercice est utilisé dans 1 séance',
    );
    expect(problemMessage(httpError(409, { code: 'EXERCISE_IN_USE' }))).toBe(
      'Cet exercice est utilisé dans une séance',
    );
    const duplicate = httpError(409, { code: 'EXERCISE_NAME_ALREADY_EXISTS', field: 'name' });
    expect(fieldErrors(duplicate)).toEqual({ name: 'Vous avez déjà un exercice de ce nom' });
  });

  it('a les libellés des nouveaux codes de séance', () => {
    expect(problemMessage(httpError(404, { code: 'WORKOUT_NOT_FOUND' }))).toBe(
      "Cette séance n'existe plus",
    );
    expect(problemMessage(httpError(404, { code: 'EXERCISE_NOT_FOUND' }))).toBe(
      "Un exercice de la séance n'existe plus",
    );
    expect(
      fieldErrors(httpError(409, { code: 'WORKOUT_NAME_ALREADY_EXISTS', field: 'name' })),
    ).toEqual({ name: 'Vous avez déjà une séance de ce nom' });
  });

  it('reprend les chemins imbriqués des erreurs 400', () => {
    const error = httpError(400, {
      code: 'VALIDATION_FAILED',
      errors: [
        { field: 'exercises[2].sets[1].reps', message: 'Au moins 1 répétition' },
        { field: 'exercises[0].sets', message: 'Ajoutez au moins une série' },
      ],
    });
    expect(fieldErrors(error)).toEqual({
      'exercises[2].sets[1].reps': 'Au moins 1 répétition',
      'exercises[0].sets': 'Ajoutez au moins une série',
    });
  });
});
