import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { AthleteApiService } from '../../../../core/api/athlete-api.service';
import { GroupApiService } from '../../../../core/api/group-api.service';
import {
  ApiProblem,
  AthleteInvitation,
  AthleteSummary,
  Group,
  Page,
} from '../../../../core/api/models/api.models';
import { AthleteListPageComponent } from './athlete-list-page.component';

const MARION: AthleteSummary = {
  id: 'ath-1',
  firstName: 'Marion',
  lastName: 'Lefèvre',
  email: 'marion.lefevre@example.fr',
  joinedAt: '2026-10-12T08:30:00.000000Z',
  groups: [{ id: 'g-1', name: 'Demi-fond' }],
};
const LUCAS: AthleteSummary = {
  id: 'ath-2',
  firstName: 'Lucas',
  lastName: 'Girard',
  email: 'lucas.girard@athlete.fr',
  joinedAt: '2026-10-14T17:05:00.000000Z',
  groups: [],
};
const CODE: AthleteInvitation = {
  id: 'inv-1',
  label: 'Inès Moreau',
  code: 'K7QH3MPA',
  expiresAt: '2026-10-30T09:15:00.000000Z',
  createdAt: '2026-10-23T09:15:00.000000Z',
};
const DEMI_FOND: Group = {
  id: 'g-1',
  name: 'Demi-fond',
  athleteCount: 1,
  createdAt: '2026-10-10T10:00:00.000000Z',
};

function pageOf<T>(content: T[]): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

function problem(status: number, body: Partial<ApiProblem>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, ...body } }));
}

describe('AthleteListPageComponent', () => {
  let fixture: ComponentFixture<AthleteListPageComponent>;
  let element: HTMLElement;
  let api: {
    list: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    listInvitations: ReturnType<typeof vi.fn>;
    createInvitation: ReturnType<typeof vi.fn>;
    revokeInvitation: ReturnType<typeof vi.fn>;
  };
  let messages: MessageService;
  let confirmations: Confirmation[];

  async function setup(
    athletes: Observable<Page<AthleteSummary>>,
    invitations: Observable<Page<AthleteInvitation>> = of(pageOf([])),
  ): Promise<void> {
    api = {
      list: vi.fn().mockReturnValue(athletes),
      remove: vi.fn(),
      listInvitations: vi.fn().mockReturnValue(invitations),
      createInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        MessageService,
        ConfirmationService,
        { provide: AthleteApiService, useValue: api },
        { provide: GroupApiService, useValue: { list: () => of(pageOf([DEMI_FOND])) } },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    confirmations = [];
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((confirmation) => {
      confirmations.push(confirmation);
      return TestBed.inject(ConfirmationService);
    });

    fixture = TestBed.createComponent(AthleteListPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function buttonByText(text: string): HTMLButtonElement {
    const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (!button) {
      throw new Error(`Bouton « ${text} » introuvable`);
    }
    return button;
  }

  it('affiche les athlètes avec leurs groupes, et les codes en attente', async () => {
    await setup(of(pageOf([MARION, LUCAS])), of(pageOf([CODE])));

    expect(api.list).toHaveBeenCalledWith({ page: 0, size: 20, q: '', groupId: undefined });
    expect(element.textContent).toContain('Lefèvre Marion');
    expect(element.textContent).toContain('marion.lefevre@example.fr');
    expect(element.textContent).toContain('Demi-fond');
    expect(element.textContent).toContain('Girard Lucas');
    expect(element.textContent).toContain('K7QH-3MPA');
  });

  it('affiche l’état vide avec le panneau du code visible', async () => {
    await setup(of(pageOf([])));

    expect(element.textContent).toContain(
      "Aucun athlète pour l'instant.",
    );
    expect(element.textContent).toContain(
      "Partagez votre code d'invitation pour qu'un athlète vous rejoigne.",
    );
    expect(element.textContent).toContain("Aucun code d'invitation actif");
    expect(buttonByText("Générer un code d'invitation")).toBeTruthy();
  });

  it('affiche une erreur avec une action de reprise', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    api.list.mockReturnValue(of(pageOf([MARION])));
    buttonByText('Réessayer').click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Lefèvre Marion');
  });

  it('génère un code pour le libellé saisi puis recharge les codes', async () => {
    await setup(of(pageOf([MARION])));
    api.createInvitation.mockReturnValue(of(CODE));
    api.listInvitations.mockReturnValue(of(pageOf([CODE])));

    const input = element.querySelector<HTMLInputElement>('#invitation-label')!;
    input.value = 'Inès Moreau';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    buttonByText("Générer un code d'invitation").click();
    await fixture.whenStable();

    expect(api.createInvitation).toHaveBeenCalledWith({ label: 'Inès Moreau' });
    expect(element.textContent).toContain('K7QH-3MPA');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Code d’invitation généré' }),
    );
  });

  it('régénère un code après confirmation : révocation puis création', async () => {
    await setup(of(pageOf([MARION])), of(pageOf([CODE])));
    api.revokeInvitation.mockReturnValue(of(undefined));
    api.createInvitation.mockReturnValue(of({ ...CODE, id: 'inv-2', code: 'ABCD2345' }));

    buttonByText('Générer un nouveau code').click();
    expect(confirmations).toHaveLength(1);
    expect(api.revokeInvitation).not.toHaveBeenCalled();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.revokeInvitation).toHaveBeenCalledWith('inv-1');
    expect(api.createInvitation).toHaveBeenCalledWith({ label: 'Inès Moreau' });
  });

  it('révoque un code après confirmation', async () => {
    await setup(of(pageOf([MARION])), of(pageOf([CODE])));
    api.revokeInvitation.mockReturnValue(of(undefined));

    buttonByText('Révoquer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.revokeInvitation).toHaveBeenCalledWith('inv-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Code révoqué' }),
    );
  });

  it('copie le code sans tiret dans le presse-papiers', async () => {
    await setup(of(pageOf([MARION])), of(pageOf([CODE])));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    buttonByText('Copier le code').click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('K7QH3MPA');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Code copié' }),
    );
  });

  it('demande confirmation en nommant l’athlète avant de le retirer', async () => {
    await setup(of(pageOf([MARION])));
    api.remove.mockReturnValue(of(undefined));
    api.list.mockReturnValue(of(pageOf([])));

    buttonByText('Retirer').click();
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].header).toContain('Marion Lefèvre');
    expect(confirmations[0].message).toContain('retiré de tous vos groupes');
    expect(api.remove).not.toHaveBeenCalled();

    confirmations[0].accept!();
    await fixture.whenStable();

    expect(api.remove).toHaveBeenCalledWith('ath-1');
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Athlète retiré' }),
    );
    expect(element.textContent).toContain("Aucun athlète pour l'instant.");
  });

  it('signale un athlète déjà retiré puis recharge la liste', async () => {
    await setup(of(pageOf([MARION])));
    api.remove.mockReturnValue(problem(404, { code: 'ATHLETE_NOT_FOUND', detail: 'x' }));

    buttonByText('Retirer').click();
    confirmations[0].accept!();
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: "Cet athlète n'est plus suivi",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });
});
