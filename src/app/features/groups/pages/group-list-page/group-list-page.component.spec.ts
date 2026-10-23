import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { GroupApiService } from '../../../../core/api/group-api.service';
import { ApiProblem, Group, Page } from '../../../../core/api/models/api.models';
import { GroupListPageComponent } from './group-list-page.component';

const SPRINT: Group = {
  id: 'g-1',
  name: 'Sprint',
  athleteCount: 3,
  createdAt: '2026-10-10T10:00:00.000000Z',
};
const DEMI_FOND: Group = { ...SPRINT, id: 'g-2', name: 'Demi-fond', athleteCount: 1 };

function pageOf(content: Group[]): Page<Group> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

describe('GroupListPageComponent', () => {
  let fixture: ComponentFixture<GroupListPageComponent>;
  let element: HTMLElement;
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    rename: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let messages: MessageService;
  let confirmations: Confirmation[];

  async function setup(firstPage: Observable<Page<Group>>): Promise<void> {
    api = {
      list: vi.fn().mockReturnValue(firstPage),
      create: vi.fn(),
      rename: vi.fn(),
      delete: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: GroupApiService, useValue: api },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });

    fixture = TestBed.createComponent(GroupListPageComponent);
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
    const input = document.querySelector<HTMLInputElement>('#group-name')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('affiche les groupes avec leur effectif', async () => {
    await setup(of(pageOf([DEMI_FOND, SPRINT])));

    expect(api.list).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(element.textContent).toContain('Demi-fond');
    expect(element.textContent).toContain('Sprint');
  });

  it('affiche un état vide explicite avec l’action de création', async () => {
    await setup(of(pageOf([])));

    expect(element.textContent).toContain("Aucun groupe pour l'instant");
    expect(buttonByText('Créer un groupe')).toBeTruthy();
  });

  it('affiche une erreur avec une action de reprise', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.list.mockReturnValue(of(pageOf([SPRINT])));
    buttonByText('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Sprint');
  });

  it('crée un groupe avec le nom sans espaces de bord puis recharge la liste', async () => {
    await setup(of(pageOf([])));
    api.create.mockReturnValue(of(SPRINT));
    api.list.mockReturnValue(of(pageOf([SPRINT])));

    buttonByText('Créer un groupe').click();
    await fixture.whenStable();
    await fillName('  Sprint ');
    buttonByText('Créer le groupe', document.body).click();
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith({ name: 'Sprint' });
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Groupe créé' }),
    );
    expect(element.textContent).toContain('Sprint');
  });

  it('garde le bouton de création désactivé pour un nom vide ou trop long', async () => {
    await setup(of(pageOf([])));
    buttonByText('Créer un groupe').click();
    await fixture.whenStable();

    const submit = buttonByText('Créer le groupe', document.body);
    await fillName('   ');
    expect(submit.disabled).toBe(true);
    await fillName('x'.repeat(61));
    expect(submit.disabled).toBe(true);
    expect(document.body.textContent).toContain('60 caractères');
    await fillName('x'.repeat(60));
    expect(submit.disabled).toBe(false);
  });

  it('affiche « Vous avez déjà un groupe de ce nom » sous le champ sur un 409', async () => {
    await setup(of(pageOf([SPRINT])));
    api.create.mockReturnValue(
      problem(409, { code: 'GROUP_NAME_ALREADY_EXISTS', detail: 'x', field: 'name' }),
    );

    buttonByText('Créer un groupe').click();
    await fixture.whenStable();
    await fillName('sprint');
    buttonByText('Créer le groupe', document.body).click();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Vous avez déjà un groupe de ce nom');
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('renomme un groupe puis recharge la liste', async () => {
    await setup(of(pageOf([SPRINT])));
    api.rename.mockReturnValue(of({ ...SPRINT, name: 'Vitesse' }));
    api.list.mockReturnValue(of(pageOf([{ ...SPRINT, name: 'Vitesse' }])));

    buttonByText('Renommer').click();
    await fixture.whenStable();
    await fillName('Vitesse');
    buttonByText('Renommer le groupe', document.body).click();
    await fixture.whenStable();

    expect(api.rename).toHaveBeenCalledWith('g-1', { name: 'Vitesse' });
    expect(element.textContent).toContain('Vitesse');
  });

  it('signale « Ce groupe n’existe plus » sur un 404 puis recharge la liste', async () => {
    await setup(of(pageOf([SPRINT])));
    api.rename.mockReturnValue(problem(404, { code: 'GROUP_NOT_FOUND', detail: 'x' }));

    buttonByText('Renommer').click();
    await fixture.whenStable();
    await fillName('Vitesse');
    buttonByText('Renommer le groupe', document.body).click();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Ce groupe n'existe plus",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('rappelle le nombre d’athlètes avant de supprimer, et ne supprime pas sans confirmation', async () => {
    await setup(of(pageOf([SPRINT])));
    api.delete.mockReturnValue(of(undefined));
    api.list.mockReturnValue(of(pageOf([])));

    buttonByText('Supprimer').click();
    expect(confirmations[0].message).toContain('3 athlètes y figurent');
    expect(api.delete).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('g-1');
    expect(element.textContent).toContain("Aucun groupe pour l'instant");
  });
});
