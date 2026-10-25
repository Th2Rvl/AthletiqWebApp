import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { AthleteApiService } from '../../../../core/api/athlete-api.service';
import { GroupApiService } from '../../../../core/api/group-api.service';
import {
  ApiProblem,
  AthleteCalendar,
  GroupCalendar,
  Page,
  PlannedSessionDetail,
} from '../../../../core/api/models/api.models';
import { PlanningApiService } from '../../../../core/api/planning-api.service';
import { WorkoutApiService } from '../../../../core/api/workout-api.service';
import { PlanSessionFormComponent } from '../../organisms/plan-session-form/plan-session-form.component';
import { PlannedSessionDetailComponent } from '../../organisms/planned-session-detail/planned-session-detail.component';
import { PlanningPageComponent } from './planning-page.component';

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 100, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

const ATHLETE_CALENDAR: AthleteCalendar = {
  athleteId: 'ath-1',
  from: '2026-11-02',
  to: '2026-11-29',
  today: '2026-11-05',
  sessions: [
    {
      id: 'ps-1',
      athleteId: 'ath-1',
      date: '2026-11-12',
      name: 'Haut du corps A',
      exerciseCount: 5,
      setCount: 15,
      groupId: null,
      locked: false,
      status: 'UPCOMING',
    },
    {
      id: 'ps-2',
      athleteId: 'ath-1',
      date: '2026-11-12',
      name: 'Gainage',
      exerciseCount: 1,
      setCount: 3,
      groupId: 'g-1',
      locked: false,
      status: 'UPCOMING',
    },
  ],
};

const EMPTY_CALENDAR: AthleteCalendar = { ...ATHLETE_CALENDAR, sessions: [] };

const GROUP_CALENDAR: GroupCalendar = {
  groupId: 'g-1',
  from: '2026-11-02',
  to: '2026-11-29',
  today: '2026-11-05',
  memberCount: 4,
  entries: [
    {
      date: '2026-11-12',
      snapshotId: 'snap-1',
      name: 'Haut du corps A',
      athleteCount: 3,
      memberCount: 4,
      locked: false,
      sessions: [
        {
          id: 'ps-7',
          athleteId: 'ath-1',
          firstName: 'Lucas',
          lastName: 'Durand',
          status: 'UPCOMING',
        },
        {
          id: 'ps-8',
          athleteId: 'ath-2',
          firstName: 'Inès',
          lastName: 'Moreau',
          status: 'UPCOMING',
        },
        {
          id: 'ps-9',
          athleteId: 'ath-3',
          firstName: 'Karim',
          lastName: 'Benali',
          status: 'UPCOMING',
        },
      ],
    },
  ],
};

const DETAIL: PlannedSessionDetail = {
  id: 'ps-1',
  athleteId: 'ath-1',
  athleteFirstName: 'Lucas',
  athleteLastName: 'Durand',
  date: '2026-11-12',
  groupId: null,
  sourceWorkoutId: 'w-1',
  locked: false,
  status: 'UPCOMING',
  name: 'Haut du corps A',
  description: null,
  exercises: [],
  createdAt: '2026-10-23T08:15:30.123456Z',
  updatedAt: '2026-10-23T08:15:30.123456Z',
};

describe('PlanningPageComponent', () => {
  let fixture: ComponentFixture<PlanningPageComponent>;
  let element: HTMLElement;
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let workoutList: ReturnType<typeof vi.fn>;
  let messages: MessageService;
  let confirmations: Confirmation[];
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(
    inputs: { athleteId?: string; groupId?: string; debut?: string },
    calendar: Observable<AthleteCalendar | GroupCalendar> = of(ATHLETE_CALENDAR),
    athletes = [{ id: 'ath-1', firstName: 'Lucas', lastName: 'Durand' }],
  ): Promise<void> {
    api = {
      athleteCalendar: vi.fn().mockReturnValue(calendar),
      groupCalendar: vi.fn().mockReturnValue(calendar),
      planForAthlete: vi.fn(),
      planForGroup: vi.fn(),
      get: vi.fn().mockReturnValue(of(DETAIL)),
      move: vi.fn(),
      cancel: vi.fn(),
      upcomingCount: vi.fn(),
      duplicateWeekForAthlete: vi.fn(),
      duplicateWeekForGroup: vi.fn(),
    };
    workoutList = vi.fn().mockReturnValue(of(pageOf([{ id: 'w-1', name: 'Haut du corps A' }])));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: PlanningApiService, useValue: api },
        { provide: AthleteApiService, useValue: { list: () => of(pageOf(athletes)) } },
        {
          provide: GroupApiService,
          useValue: { list: () => of(pageOf([{ id: 'g-1', name: 'Demi-fond', athleteCount: 4 }])) },
        },
        { provide: WorkoutApiService, useValue: { list: workoutList } },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(PlanningPageComponent);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function buttonByText(text: string, root: ParentNode = element): HTMLButtonElement {
    const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (!button) {
      throw new Error(`Bouton « ${text} » introuvable`);
    }
    return button;
  }

  it("lit le calendrier de l'athlète sur 4 semaines à partir du lundi de ?debut=", async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-05' });

    expect(api['athleteCalendar']).toHaveBeenCalledWith('ath-1', '2026-11-02', '2026-11-29');
    expect(element.textContent).toContain('Lucas Durand');
    expect(element.textContent).toContain('2 nov. – 29 nov. 2026');
    expect(element.textContent).toContain('Haut du corps A');
    expect(element.textContent).toContain('Gainage');
    expect(element.textContent).toContain('5 exercices, 15 séries');
  });

  it('garde la période dans l’URL : semaine suivante, précédente, aujourd’hui', async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-02' });

    element.querySelector<HTMLButtonElement>('[aria-label="Semaine suivante"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { debut: '2026-11-09' } }),
    );
    element.querySelector<HTMLButtonElement>('[aria-label="Semaine précédente"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { debut: '2026-10-26' } }),
    );
    buttonByText("Aujourd'hui").click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: {} }));
  });

  it("affiche l'état vide d'une période sans séance, jours cliquables", async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-02' }, of(EMPTY_CALENDAR));

    expect(element.textContent).toContain('Aucune séance planifiée sur cette période');
    expect(element.querySelectorAll('button.calendar__plan').length).toBeGreaterThan(0);
  });

  it('affiche une erreur réseau avec « Réessayer »', async () => {
    await setup(
      { athleteId: 'ath-1' },
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api['athleteCalendar'].mockReturnValue(of(ATHLETE_CALENDAR));
    buttonByText('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Haut du corps A');
  });

  it('signale un athlète qui n’est plus suivi (404)', async () => {
    await setup({ athleteId: 'ath-9' }, problem(404, { code: 'ATHLETE_NOT_FOUND' }));

    expect(element.textContent).toContain("Cet athlète n'est plus suivi");
    expect(element.querySelector('app-planning-calendar')).toBeNull();
  });

  it('sans cible : invite à choisir un athlète ou un groupe, sans lire de calendrier', async () => {
    await setup({});
    expect(element.textContent).toContain('Choisissez un athlète ou un groupe');
    expect(api['athleteCalendar']).not.toHaveBeenCalled();
  });

  it('planifie pour un athlète depuis une case, puis recharge le calendrier', async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-02' });
    api['planForAthlete'].mockReturnValue(of(DETAIL));

    element
      .querySelector<HTMLButtonElement>(
        '[aria-label="Planifier une séance le jeudi 19 novembre 2026"]',
      )!
      .click();
    await fixture.whenStable();
    expect(workoutList).toHaveBeenCalledWith({ page: 0, size: 100 });
    const form = fixture.debugElement.query(By.directive(PlanSessionFormComponent))
      .componentInstance as PlanSessionFormComponent;
    form.submitted.emit({ workoutId: 'w-1', date: '2026-11-19' });
    await fixture.whenStable();

    expect(api['planForAthlete']).toHaveBeenCalledWith('ath-1', {
      workoutId: 'w-1',
      date: '2026-11-19',
    });
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Séance planifiée',
        detail: 'Haut du corps A, jeudi 19 novembre 2026',
      }),
    );
    expect(api['athleteCalendar']).toHaveBeenCalledTimes(2);
  });

  it('affiche sous le champ date le 409 PLANNING_DATE_IN_PAST', async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-02' });
    api['planForAthlete'].mockReturnValue(
      problem(409, { code: 'PLANNING_DATE_IN_PAST', field: 'date', detail: 'x' }),
    );

    buttonByText('Planifier une séance').click();
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(PlanSessionFormComponent));
    (form.componentInstance as PlanSessionFormComponent).submitted.emit({
      workoutId: 'w-1',
      date: '2026-11-05',
    });
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Impossible de planifier à une date passée');
  });

  it('planifie pour un groupe et annonce le nombre de séances créées', async () => {
    await setup({ groupId: 'g-1', debut: '2026-11-02' }, of(GROUP_CALENDAR));
    api['planForGroup'].mockReturnValue(of({ created: 4 }));

    expect(api['groupCalendar']).toHaveBeenCalledWith('g-1', '2026-11-02', '2026-11-29');
    expect(element.textContent).toContain('3/4 athlètes');
    buttonByText('Planifier une séance').click();
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(PlanSessionFormComponent));
    (form.componentInstance as PlanSessionFormComponent).submitted.emit({
      workoutId: 'w-1',
      date: '2026-11-20',
    });
    await fixture.whenStable();

    expect(api['planForGroup']).toHaveBeenCalledWith('g-1', {
      workoutId: 'w-1',
      date: '2026-11-20',
    });
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Séance planifiée pour 4 athlètes' }),
    );
  });

  it('groupe sans membre : planification désactivée avec la marche à suivre', async () => {
    await setup({ groupId: 'g-1' }, of({ ...GROUP_CALENDAR, memberCount: 0, entries: [] }));

    expect(element.textContent).toContain("Ajoutez d'abord des athlètes au groupe");
    expect(buttonByText('Planifier une séance').disabled).toBe(true);
    expect(element.querySelectorAll('button.calendar__plan')).toHaveLength(0);
  });

  it('groupe : un clic sur la séance liste les athlètes, puis ouvre la séance de l’un d’eux', async () => {
    await setup({ groupId: 'g-1', debut: '2026-11-02' }, of(GROUP_CALENDAR));

    buttonByText('Haut du corps A').click();
    await fixture.whenStable();
    expect(document.body.textContent).toContain('Moreau Inès');
    (
      document.querySelector('[aria-label="Voir la séance de Inès Moreau"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(api['get']).toHaveBeenCalledWith('ps-8');
  });

  it('groupe : la séance passée affiche le nombre de réalisées (#7)', async () => {
    const [entry] = GROUP_CALENDAR.entries;
    const past: GroupCalendar = {
      ...GROUP_CALENDAR,
      entries: [
        {
          ...entry,
          date: '2026-11-03',
          locked: true,
          sessions: [
            { ...entry.sessions[0], status: 'DONE' },
            { ...entry.sessions[1], status: 'DONE' },
            { ...entry.sessions[2], status: 'MISSED' },
          ],
        },
      ],
    };
    await setup({ groupId: 'g-1', debut: '2026-11-02' }, of(past));

    const state = element.querySelector('.chip__state')!;
    expect(state.textContent).toContain('2/3 réalisées');
    expect(state.classList).toContain('chip__state--missed');
  });

  it('annule une séance après une confirmation qui nomme séance, athlète et date', async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-02' });
    api['cancel'].mockReturnValue(of(undefined));

    buttonByText('Haut du corps A').click();
    await fixture.whenStable();
    expect(api['get']).toHaveBeenCalledWith('ps-1');
    const detail = fixture.debugElement.query(By.directive(PlannedSessionDetailComponent))
      .componentInstance as PlannedSessionDetailComponent;
    detail.cancelSession.emit();

    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].message).toContain('Haut du corps A');
    expect(confirmations[0].message).toContain('Lucas Durand');
    expect(confirmations[0].message).toContain('jeudi 12 novembre 2026');
    expect(api['cancel']).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();
    expect(api['cancel']).toHaveBeenCalledWith('ps-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Séance annulée' }),
    );
    expect(api['athleteCalendar']).toHaveBeenCalledTimes(2);
  });

  it('déplace une séance, et recharge le calendrier quand elle n’existe plus (404)', async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-02' });
    api['move'].mockReturnValue(of({ ...DETAIL, date: '2026-11-19' }));

    buttonByText('Haut du corps A').click();
    await fixture.whenStable();
    const detail = fixture.debugElement.query(By.directive(PlannedSessionDetailComponent))
      .componentInstance as PlannedSessionDetailComponent;
    detail.move.emit('2026-11-19');
    await fixture.whenStable();
    expect(api['move']).toHaveBeenCalledWith('ps-1', '2026-11-19');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Séance déplacée',
        detail: 'Haut du corps A, jeudi 19 novembre 2026',
      }),
    );

    api['move'].mockReturnValue(problem(404, { code: 'PLANNED_SESSION_NOT_FOUND' }));
    detail.move.emit('2026-11-20');
    await fixture.whenStable();
    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cette séance planifiée n'existe plus",
    });
    expect(api['athleteCalendar']).toHaveBeenCalledTimes(3);
  });

  it('duplique une semaine et affiche le nombre de séances créées', async () => {
    await setup({ athleteId: 'ath-1', debut: '2026-11-09' });
    api['duplicateWeekForAthlete'].mockReturnValue(of({ created: 6 }));

    buttonByText('Dupliquer une semaine').click();
    await fixture.whenStable();
    expect(document.body.textContent).toContain('Semaine du 9 novembre 2026');
    buttonByText('Dupliquer la semaine', document.body).click();
    await fixture.whenStable();

    expect(api['duplicateWeekForAthlete']).toHaveBeenCalledWith('ath-1', {
      weekStart: '2026-11-09',
      weeks: 1,
    });
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Semaine dupliquée',
        detail: '6 séances planifiées créées',
      }),
    );
  });
});
