import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Invitation } from '../../../../core/api/models/api.models';
import { InvitationTableComponent } from './invitation-table.component';

const MANON: Invitation = {
  id: 'invitation-1',
  organisationId: 'org-1',
  email: 'manon.roux@stade-rennais-athle.fr',
  status: 'PENDING',
  coachId: null,
  createdAt: '2026-10-21T09:12:45.302290Z',
  updatedAt: '2026-10-21T09:12:45.302290Z',
};

describe('InvitationTableComponent', () => {
  let fixture: ComponentFixture<InvitationTableComponent>;
  let element: HTMLElement;

  async function render(invitations: Invitation[]): Promise<void> {
    fixture = TestBed.createComponent(InvitationTableComponent);
    fixture.componentRef.setInput('invitations', invitations);
    fixture.componentRef.setInput('totalRecords', invitations.length);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes(text),
    );
  }

  it('affiche « Aucune invitation en attente » et propose d’inviter un coach', async () => {
    await render([]);
    const invite = vi.fn();
    fixture.componentInstance.invite.subscribe(invite);

    expect(element.textContent).toContain('Aucune invitation en attente');
    expect(element.querySelector('p-table')).toBeNull();

    buttonByText('Inviter un coach')!.click();
    expect(invite).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas l'état vide pendant le premier chargement", async () => {
    fixture = TestBed.createComponent(InvitationTableComponent);
    fixture.componentRef.setInput('invitations', []);
    fixture.componentRef.setInput('totalRecords', 0);
    fixture.componentRef.setInput('loaded', false);
    fixture.componentRef.setInput('loading', true);
    element = fixture.nativeElement;
    await fixture.whenStable();

    expect(element.textContent).not.toContain('Aucune invitation en attente');
  });

  it("affiche l'invitation en attente et remonte son annulation", async () => {
    await render([MANON]);
    const cancel = vi.fn();
    fixture.componentInstance.cancel.subscribe(cancel);

    expect(element.textContent).toContain('manon.roux@stade-rennais-athle.fr');
    expect(element.textContent).toContain('En attente');

    buttonByText("Annuler l'invitation")!.click();
    expect(cancel).toHaveBeenCalledWith(MANON);
  });
});
