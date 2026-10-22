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
