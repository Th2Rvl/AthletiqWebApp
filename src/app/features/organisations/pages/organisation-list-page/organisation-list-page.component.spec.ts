import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { ApiProblem, Organisation, Page } from '../../../../core/api/models/api.models';
import { OrganisationApiService } from '../../../../core/api/organisation-api.service';
import { OrganisationListPageComponent } from './organisation-list-page.component';

function organisation(overrides: Partial<Organisation>): Organisation {
  return {
    id: 'org-1',
    name: 'Stade Rennais Athlétisme',
    description: "Club d'athlétisme rennais : sprint, demi-fond et épreuves combinées.",
    coachCount: 2,
    athleteCount: 0,
    pendingInvitationCount: 1,
    createdAt: '2026-10-21T09:12:44.512031Z',
    updatedAt: '2026-10-21T09:12:44.512031Z',
    ...overrides,
  };
}

const RENNES = organisation({});
const NANTES = organisation({
  id: 'org-2',
  name: 'Nantes Métropole Athlétisme',
  description: 'Section piste et cross de la métropole nantaise.',
  coachCount: 3,
  pendingInvitationCount: 0,
});

function pageOf(content: Organisation[]): Page<Organisation> {
  return {
    content,
    page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 },
  };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: body }));
}

describe('OrganisationListPageComponent', () => {
  let fixture: ComponentFixture<OrganisationListPageComponent>;
  let element: HTMLElement;
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let messages: MessageService;
  let confirmations: Confirmation[];

  async function setup(firstPage: Observable<Page<Organisation>>): Promise<void> {
    api = {
      list: vi.fn().mockReturnValue(firstPage),
      create: vi.fn(),
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

    fixture = TestBed.createComponent(OrganisationListPageComponent);
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

  async function fillName(name: string): Promise<void> {
    const input = document.querySelector<HTMLInputElement>('#organisation-name')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('affiche les organisations triées par nom', async () => {
    await setup(of(pageOf([NANTES, RENNES])));

    expect(api.list).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      q: '',
      sort: { field: 'name', direction: 'asc' },
    });
    expect(element.textContent).toContain('Nantes Métropole Athlétisme');
    expect(element.textContent).toContain('Stade Rennais Athlétisme');
  });

  it('affiche un état vide explicite sans organisation', async () => {
    await setup(of(pageOf([])));

    expect(element.textContent).toContain("Aucune organisation pour l'instant");
    expect(buttonByText('Créer une organisation')).toBeTruthy();
  });

  it('affiche une erreur avec une action de reprise', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.list.mockReturnValue(of(pageOf([RENNES])));
    buttonByText('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Stade Rennais Athlétisme');
  });

  it('crée une organisation puis recharge la liste', async () => {
    await setup(of(pageOf([])));
    const created = organisation({ id: 'org-3', name: 'Trail Club du Morbihan', coachCount: 0 });
    api.create.mockReturnValue(of(created));
    api.list.mockReturnValue(of(pageOf([created])));

    buttonByText('Créer une organisation').click();
    await fixture.whenStable();
    await fillName('  Trail Club du Morbihan ');
    buttonByText("Créer l'organisation", document.body).click();
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith({ name: 'Trail Club du Morbihan', description: null });
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Organisation créée' }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Trail Club du Morbihan');
  });

  it('affiche « Une organisation porte déjà ce nom » sous le champ sur un 409', async () => {
    await setup(of(pageOf([RENNES])));
    api.create.mockReturnValue(
      problem(409, {
        status: 409,
        code: 'ORGANISATION_NAME_TAKEN',
        detail: 'Une organisation porte déjà ce nom',
        field: 'name',
      }),
    );

    buttonByText('Créer une organisation').click();
    await fixture.whenStable();
    await fillName('stade rennais athlétisme');
    buttonByText("Créer l'organisation", document.body).click();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Une organisation porte déjà ce nom');
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('remplace la ligne modifiée par la réponse du serveur', async () => {
    await setup(of(pageOf([RENNES])));
    const renamed = { ...RENNES, name: 'Stade Rennais Athlétisme Jeunes' };
    api.update.mockReturnValue(of(renamed));

    buttonByText('Modifier').click();
    await fixture.whenStable();
    await fillName(renamed.name);
    buttonByText('Enregistrer les modifications', document.body).click();
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith('org-1', {
      name: renamed.name,
      description: RENNES.description,
    });
    expect(element.textContent).toContain('Stade Rennais Athlétisme Jeunes');
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('signale une organisation supprimée entre-temps puis recharge la liste', async () => {
    await setup(of(pageOf([RENNES])));
    api.update.mockReturnValue(
      problem(404, { status: 404, code: 'ORGANISATION_NOT_FOUND', detail: 'x' }),
    );

    buttonByText('Modifier').click();
    await fixture.whenStable();
    await fillName('Stade Rennais');
    buttonByText('Enregistrer les modifications', document.body).click();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Cette organisation n'existe plus" }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('demande confirmation en rappelant le nombre de coachs avant de supprimer', async () => {
    await setup(of(pageOf([RENNES])));
    api.delete.mockReturnValue(of(undefined));

    buttonByText('Supprimer').click();
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].message).toContain('2 coachs y sont rattachés');
    expect(api.delete).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();
    expect(api.delete).toHaveBeenCalledWith('org-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Organisation supprimée' }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('signale une organisation déjà supprimée à la suppression puis recharge la liste', async () => {
    await setup(of(pageOf([RENNES])));
    api.delete.mockReturnValue(
      problem(404, { status: 404, code: 'ORGANISATION_NOT_FOUND', detail: 'x' }),
    );
    api.list.mockReturnValue(of(pageOf([])));

    buttonByText('Supprimer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('org-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Cette organisation n'existe plus" }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).not.toContain('Stade Rennais Athlétisme');
  });

  it('ne supprime rien si la confirmation est annulée', async () => {
    await setup(of(pageOf([RENNES])));
    buttonByText('Supprimer').click();
    confirmations[0].reject?.();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('recherche par nom à partir de la première page', async () => {
    await setup(of(pageOf([RENNES, NANTES])));
    api.list.mockReturnValue(of(pageOf([NANTES])));

    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'nantes';
    search.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, q: 'nantes' }));
    expect(element.textContent).not.toContain('Stade Rennais Athlétisme');
  });
});
