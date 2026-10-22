import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import {
  ApiProblem,
  Invitation,
  Organisation,
  OrganisationCoach,
  Page,
} from '../../../../core/api/models/api.models';
import { OrganisationApiService } from '../../../../core/api/organisation-api.service';
import { OrganisationDetailPageComponent } from './organisation-detail-page.component';

const ORG_ID = 'org-1';

const RENNES: Organisation = {
  id: ORG_ID,
  name: 'Stade Rennais Athlétisme',
  description: "Club d'athlétisme rennais : sprint, demi-fond et épreuves combinées.",
  coachCount: 2,
  athleteCount: 0,
  pendingInvitationCount: 1,
  createdAt: '2026-10-21T09:12:44.512031Z',
  updatedAt: '2026-10-21T09:12:44.512031Z',
};

const CLAIRE: OrganisationCoach = {
  coachId: 'coach-1',
  firstName: 'Claire',
  lastName: 'Martin',
  email: 'claire.martin@stade-rennais-athle.fr',
  joinedAt: '2026-10-21T09:12:45.004118Z',
};
const JULIEN: OrganisationCoach = {
  coachId: 'coach-2',
  firstName: 'Julien',
  lastName: 'Lefebvre',
  email: 'julien.lefebvre@stade-rennais-athle.fr',
  joinedAt: '2026-10-21T09:12:45.118734Z',
};

const MANON: Invitation = {
  id: 'invitation-1',
  organisationId: ORG_ID,
  email: 'manon.roux@stade-rennais-athle.fr',
  status: 'PENDING',
  coachId: null,
  createdAt: '2026-10-21T09:12:45.302290Z',
  updatedAt: '2026-10-21T09:12:45.302290Z',
};

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

/** jsdom n'implémente pas `ResizeObserver`, que `p-tablist` utilise pour ses flèches de défilement. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('OrganisationDetailPageComponent', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  let fixture: ComponentFixture<OrganisationDetailPageComponent>;
  let element: HTMLElement;
  let api: Record<
    | 'get'
    | 'listCoaches'
    | 'listAthletes'
    | 'listInvitations'
    | 'inviteCoach'
    | 'removeCoach'
    | 'cancelInvitation'
    | 'update'
    | 'delete',
    ReturnType<typeof vi.fn>
  >;
  let messages: MessageService;
  let confirmations: Confirmation[];

  async function setup(organisation: Observable<Organisation> = of(RENNES)): Promise<void> {
    api = {
      get: vi.fn().mockReturnValue(organisation),
      listCoaches: vi.fn().mockReturnValue(of(pageOf([CLAIRE, JULIEN]))),
      listAthletes: vi.fn().mockReturnValue(of(pageOf([]))),
      listInvitations: vi.fn().mockReturnValue(of(pageOf([MANON]))),
      inviteCoach: vi.fn(),
      removeCoach: vi.fn(),
      cancelInvitation: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: OrganisationApiService, useValue: api },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });

    fixture = TestBed.createComponent(OrganisationDetailPageComponent);
    fixture.componentRef.setInput('organisationId', ORG_ID);
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

  async function invite(email: string): Promise<void> {
    buttonByText('Inviter un coach').click();
    await fixture.whenStable();
    const input = document.querySelector<HTMLInputElement>('#invitation-email')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    buttonByText('Inviter le coach', document.body).click();
    await fixture.whenStable();
  }

  it('affiche le nom, la description, les effectifs et les coachs', async () => {
    await setup();

    expect(element.querySelector('h1')?.textContent).toContain('Stade Rennais Athlétisme');
    expect(element.textContent).toContain('sprint, demi-fond');
    expect(element.textContent).toContain('Claire Martin');
    expect(element.textContent).toContain('julien.lefebvre@stade-rennais-athle.fr');
    expect(api.listCoaches).toHaveBeenCalledWith(ORG_ID, { page: 0, size: 20 });
  });

  it('affiche « Organisation introuvable » sur un 404', async () => {
    await setup(problem(404, { code: 'ORGANISATION_NOT_FOUND' }));

    expect(element.textContent).toContain('Organisation introuvable');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    buttonByText('Retour à la liste des organisations').click();
    expect(navigate).toHaveBeenCalledWith(['/organisations']);
  });

  it('affiche les états vides des coachs et des athlètes', async () => {
    await setup(of({ ...RENNES, coachCount: 0 }));
    api.listCoaches.mockReturnValue(of(pageOf([])));
    fixture.componentInstance['coaches'].reload();
    await fixture.whenStable();

    expect(element.textContent).toContain('Aucun coach dans cette organisation');
    expect(element.textContent).toContain("Aucun athlète pour l'instant");
  });

  it('rattache un coach existant et recharge les coachs', async () => {
    await setup();
    api.inviteCoach.mockReturnValue(
      of({
        ...MANON,
        id: 'invitation-2',
        email: 'coach@club.fr',
        status: 'ACCEPTED',
        coachId: 'c',
      }),
    );

    await invite('coach@club.fr');

    expect(api.inviteCoach).toHaveBeenCalledWith(ORG_ID, 'coach@club.fr');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Coach rattaché à l'organisation" }),
    );
    expect(api.listCoaches).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('crée une invitation en attente pour un e-mail sans compte', async () => {
    await setup();
    api.inviteCoach.mockReturnValue(
      of({ ...MANON, id: 'invitation-3', email: 'nouveau@club.fr', status: 'PENDING' }),
    );

    await invite('nouveau@club.fr');

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Invitation en attente' }),
    );
    expect(api.listInvitations).toHaveBeenCalledTimes(2);
  });

  it("affiche le refus d'invitation sous le champ e-mail", async () => {
    await setup();
    api.inviteCoach.mockReturnValue(
      problem(409, {
        code: 'COACH_ALREADY_MEMBER',
        detail: "Ce coach fait déjà partie de l'organisation",
        field: 'email',
      }),
    );

    await invite('claire.martin@stade-rennais-athle.fr');

    expect(document.body.textContent).toContain("Ce coach fait déjà partie de l'organisation");
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('retire un coach après confirmation', async () => {
    await setup();
    api.removeCoach.mockReturnValue(of(undefined));

    buttonByText('Retirer').click();
    expect(confirmations[0].header).toContain('Claire Martin');
    expect(api.removeCoach).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.removeCoach).toHaveBeenCalledWith(ORG_ID, 'coach-1');
    expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Coach retiré' }));
    expect(api.listCoaches).toHaveBeenCalledTimes(2);
  });

  it('annule une invitation en attente après confirmation', async () => {
    await setup();
    api.cancelInvitation.mockReturnValue(of(undefined));

    buttonByText("Annuler l'invitation").click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.cancelInvitation).toHaveBeenCalledWith(ORG_ID, 'invitation-1');
    expect(api.listInvitations).toHaveBeenCalledTimes(2);
  });

  it('bascule sur « Organisation introuvable » si elle a été supprimée entre-temps', async () => {
    await setup();
    api.removeCoach.mockReturnValue(problem(404, { code: 'ORGANISATION_NOT_FOUND' }));

    buttonByText('Retirer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Cette organisation n'existe plus" }),
    );
    expect(element.textContent).toContain('Organisation introuvable');
  });
});
