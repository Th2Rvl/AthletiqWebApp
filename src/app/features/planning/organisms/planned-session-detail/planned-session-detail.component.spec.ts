import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PlannedSessionDetail } from '../../../../core/api/models/api.models';
import { PlannedSessionDetailComponent } from './planned-session-detail.component';

const SESSION: PlannedSessionDetail = {
  id: 'ps-1',
  athleteId: 'ath-1',
  athleteFirstName: 'Lucas',
  athleteLastName: 'Durand',
  date: '2026-11-12',
  groupId: null,
  sourceWorkoutId: 'w-1',
  locked: false,
  name: 'Haut du corps A',
  description: 'Tempo contrôlé à la descente',
  exercises: [
    {
      position: 0,
      exercise: { id: 'ex-1', name: 'Développé couché', muscleGroup: 'PECTORAUX' },
      note: 'Pause d’une seconde sur la poitrine',
      sets: [
        { position: 0, reps: 8, loadKg: 62.5, restSeconds: 90 },
        { position: 1, reps: 6, loadKg: null, restSeconds: null },
      ],
    },
  ],
  createdAt: '2026-10-23T08:15:30.123456Z',
  updatedAt: '2026-10-23T08:15:30.123456Z',
};

describe('PlannedSessionDetailComponent', () => {
  let fixture: ComponentFixture<PlannedSessionDetailComponent>;
  let element: HTMLElement;

  async function render(session: PlannedSessionDetail | null = SESSION) {
    // Locale de l'application (app.config) : charges au format français « 62,5 kg ».
    registerLocaleData(localeFr);
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
    fixture = TestBed.createComponent(PlannedSessionDetailComponent);
    fixture.componentRef.setInput('session', session);
    fixture.componentRef.setInput('today', '2026-11-05');
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement | undefined {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(text),
    );
  }

  it("affiche l'instantané : athlète, jour, exercices et séries (répétitions, charge, repos)", async () => {
    await render();

    expect(element.textContent).toContain('Lucas Durand, jeudi 12 novembre 2026');
    expect(element.textContent).toContain('Tempo contrôlé à la descente');
    expect(element.textContent).toContain('Développé couché');
    expect(element.textContent).toContain('Pectoraux');
    expect(element.textContent).toContain('62,5 kg');
    expect(element.textContent).toContain('1:30');
    expect(element.textContent).toContain('Poids du corps');
  });

  it('déplace vers un jour choisi au clavier ou dans le calendrier', async () => {
    await render();
    const moves: string[] = [];
    fixture.componentInstance.move.subscribe((date) => moves.push(date));

    button('Déplacer')!.click();
    await fixture.whenStable();
    expect(button('Déplacer la séance')!.disabled).toBe(true);

    fixture.debugElement
      .query(By.css('p-datepicker'))
      .triggerEventHandler('ngModelChange', new Date(2026, 10, 19));
    await fixture.whenStable();
    button('Déplacer la séance')!.click();

    expect(moves).toEqual(['2026-11-19']);
  });

  it('demande l’annulation à la page', async () => {
    await render();
    let cancelled = 0;
    fixture.componentInstance.cancelSession.subscribe(() => cancelled++);

    button('Annuler la séance')!.click();

    expect(cancelled).toBe(1);
  });

  it('masque Déplacer et Annuler pour une séance passée ou réalisée', async () => {
    await render({ ...SESSION, date: '2026-11-02', locked: true });

    expect(button('Déplacer')).toBeUndefined();
    expect(button('Annuler la séance')).toBeUndefined();
    expect(element.textContent).toContain('ne peut plus être déplacée ni annulée');
    expect(element.textContent).toContain('Passée');
  });

  it('affiche un squelette pendant le chargement, et une erreur avec « Réessayer »', async () => {
    await render(null);
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();

    fixture.componentRef.setInput('errorMessage', 'Le serveur ne répond pas.');
    await fixture.whenStable();
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);
    button('Réessayer')!.click();
    expect(retried).toBe(1);
  });
});
