import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { AthleteApiService } from '../../../../core/api/athlete-api.service';
import { GroupApiService } from '../../../../core/api/group-api.service';
import {
  ApiProblem,
  AthleteSummary,
  Group,
  GroupMember,
  Page,
} from '../../../../core/api/models/api.models';
import { GroupDetailPageComponent } from './group-detail-page.component';

const SPRINT: Group = {
  id: 'g-1',
  name: 'Sprint',
  athleteCount: 1,
  createdAt: '2026-10-10T10:00:00.000000Z',
};
const MARION: GroupMember = {
  athleteId: 'ath-1',
  firstName: 'Marion',
  lastName: 'Lefèvre',
  email: 'marion.lefevre@example.fr',
  addedAt: '2026-10-15T08:30:00.000000Z',
};
const LUCAS: AthleteSummary = {
  id: 'ath-2',
  firstName: 'Lucas',
  lastName: 'Girard',
  email: 'lucas.girard@athlete.fr',
  joinedAt: '2026-10-14T17:05:00.000000Z',
  groups: [],
};

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

describe('GroupDetailPageComponent', () => {
  let fixture: ComponentFixture<GroupDetailPageComponent>;
  let element: HTMLElement;
  let groups: {
    get: ReturnType<typeof vi.fn>;
    listMembers: ReturnType<typeof vi.fn>;
    addMembers: ReturnType<typeof vi.fn>;
    removeMember: ReturnType<typeof vi.fn>;
    rename: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let athletes: { list: ReturnType<typeof vi.fn> };
  let messages: MessageService;
  let confirmations: Confirmation[];

  async function setup(
    options: {
      group?: Observable<Group>;
      members?: Observable<Page<GroupMember>>;
      coachAthletes?: Page<AthleteSummary>;
    } = {},
  ): Promise<void> {
    groups = {
      get: vi.fn().mockReturnValue(options.group ?? of(SPRINT)),
      listMembers: vi.fn().mockReturnValue(options.members ?? of(pageOf([MARION]))),
      addMembers: vi.fn(),
      removeMember: vi.fn(),
      rename: vi.fn(),
      delete: vi.fn(),
    };
    athletes = { list: vi.fn().mockReturnValue(of(options.coachAthletes ?? pageOf([LUCAS]))) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: GroupApiService, useValue: groups },
        { provide: AthleteApiService, useValue: athletes },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });

    fixture = TestBed.createComponent(GroupDetailPageComponent);
    fixture.componentRef.setInput('groupId', 'g-1');
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

  it('affiche le groupe et sa composition', async () => {
    await setup();

    expect(groups.get).toHaveBeenCalledWith('g-1');
    expect(groups.listMembers).toHaveBeenCalledWith('g-1', { page: 0, size: 20 });
    expect(element.querySelector('h1')?.textContent).toContain('Sprint');
    expect(element.textContent).toContain('1 athlète');
    expect(element.textContent).toContain('Lefèvre Marion');
  });

  it('affiche l’état vide avec le bouton d’ajout', async () => {
    await setup({ members: of(pageOf([])) });

    expect(element.textContent).toContain('Aucun athlète dans ce groupe');
    expect(buttonByText('Ajouter des athlètes').disabled).toBe(false);
  });

  it('désactive l’ajout et explique pourquoi quand le coach n’a aucun athlète', async () => {
    await setup({ members: of(pageOf([])), coachAthletes: pageOf([]) });

    expect(element.textContent).toContain("Invitez d'abord des athlètes");
    expect(element.querySelector('button[disabled]') ?? element.textContent).toBeTruthy();
    expect(
      [...element.querySelectorAll('button')].some((b) => b.textContent?.includes('Ajouter des athlètes')),
    ).toBe(false);
  });

  it('affiche « Ce groupe n’existe plus » sur un 404', async () => {
    await setup({ group: problem(404, { code: 'GROUP_NOT_FOUND', detail: 'x' }) });

    expect(element.textContent).toContain("Ce groupe n'existe plus");
  });

  it('affiche une erreur de composition avec une action de reprise', async () => {
    await setup({ members: throwError(() => new HttpErrorResponse({ status: 0 })) });

    expect(element.textContent).toContain('Le serveur ne répond pas');
    groups.listMembers.mockReturnValue(of(pageOf([MARION])));
    buttonByText('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Lefèvre Marion');
  });

  it('propose seulement les athlètes absents du groupe et ajoute la sélection par lot', async () => {
    await setup();
    groups.addMembers.mockReturnValue(of({ ...SPRINT, athleteCount: 2 }));
    groups.listMembers.mockReturnValue(
      of(pageOf([MARION, { ...MARION, athleteId: 'ath-2', firstName: 'Lucas', lastName: 'Girard' }])),
    );

    buttonByText('Ajouter des athlètes').click();
    await fixture.whenStable();
    expect(athletes.list).toHaveBeenCalledWith({ page: 0, size: 100, excludeGroupId: 'g-1' });

    const picker = fixture.debugElement.query((node) => node.name === 'app-group-athlete-picker');
    picker.componentInstance.selected.set(['ath-2']);
    picker.componentInstance.submit();
    await fixture.whenStable();

    expect(groups.addMembers).toHaveBeenCalledWith('g-1', { athleteIds: ['ath-2'] });
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Athlète ajouté au groupe' }),
    );
    expect(element.textContent).toContain('2 athlètes');
    expect(element.textContent).toContain('Girard Lucas');
  });

  it('refuse le lot entier quand un athlète n’est plus suivi, et recharge les candidats', async () => {
    await setup();
    groups.addMembers.mockReturnValue(problem(404, { code: 'ATHLETE_NOT_FOUND', detail: 'x' }));

    buttonByText('Ajouter des athlètes').click();
    await fixture.whenStable();
    const picker = fixture.debugElement.query((node) => node.name === 'app-group-athlete-picker');
    picker.componentInstance.selected.set(['ath-2']);
    picker.componentInstance.submit();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cet athlète n'est plus suivi",
    });
    expect(athletes.list).toHaveBeenCalledTimes(3);
  });

  it('retire un athlète du groupe après confirmation, sans le retirer des athlètes', async () => {
    await setup();
    groups.removeMember.mockReturnValue(of(undefined));
    groups.listMembers.mockReturnValue(of(pageOf([])));

    buttonByText('Retirer du groupe').click();
    expect(confirmations[0].message).toContain('reste l\'un de vos athlètes');
    expect(groups.removeMember).not.toHaveBeenCalled();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(groups.removeMember).toHaveBeenCalledWith('g-1', 'ath-1');
    expect(element.textContent).toContain('Aucun athlète dans ce groupe');
  });

  it('renomme le groupe et affiche le nouveau nom', async () => {
    await setup();
    groups.rename.mockReturnValue(of({ ...SPRINT, name: 'Vitesse' }));

    buttonByText('Renommer').click();
    await fixture.whenStable();
    const input = document.querySelector<HTMLInputElement>('#group-name')!;
    input.value = 'Vitesse';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    buttonByText('Renommer le groupe', document.body).click();
    await fixture.whenStable();

    expect(groups.rename).toHaveBeenCalledWith('g-1', { name: 'Vitesse' });
    expect(element.querySelector('h1')?.textContent).toContain('Vitesse');
  });
});
