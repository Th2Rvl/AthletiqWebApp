import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AthleteInvitation } from '../../../../core/api/models/api.models';
import { InvitationPanelComponent, formatInvitationCode } from './invitation-panel.component';

const LUCAS: AthleteInvitation = {
  id: 'inv-1',
  label: 'Lucas Girard',
  code: 'K7QH3MPA',
  expiresAt: '2026-10-30T09:15:00.000000Z',
  createdAt: '2026-10-23T09:15:00.000000Z',
};

describe('InvitationPanelComponent', () => {
  let fixture: ComponentFixture<InvitationPanelComponent>;
  let element: HTMLElement;

  async function setup(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(InvitationPanelComponent);
    fixture.componentRef.setInput('invitations', []);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
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

  async function fillLabel(label: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>('#invitation-label')!;
    input.value = label;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('formate le code en XXXX-XXXX', () => {
    expect(formatInvitationCode('K7QH3MPA')).toBe('K7QH-3MPA');
  });

  it('affiche l’état vide sans code actif', async () => {
    await setup();
    expect(element.textContent).toContain("Aucun code d'invitation actif");
  });

  it('affiche le code formaté, son expiration et les actions', async () => {
    await setup({ invitations: [LUCAS] });

    expect(element.textContent).toContain('Lucas Girard');
    expect(element.textContent).toContain('K7QH-3MPA');
    expect(element.textContent).toMatch(/Expire le 30 \S+ 2026/);
    expect(buttonByText('Copier le code')).toBeTruthy();
    expect(buttonByText('Révoquer')).toBeTruthy();
  });

  it('remonte la copie, la régénération et la révocation', async () => {
    await setup({ invitations: [LUCAS] });
    const copy = vi.fn();
    const regenerate = vi.fn();
    const revoke = vi.fn();
    fixture.componentInstance.copy.subscribe(copy);
    fixture.componentInstance.regenerate.subscribe(regenerate);
    fixture.componentInstance.revoke.subscribe(revoke);

    buttonByText('Copier le code').click();
    buttonByText('Générer un nouveau code').click();
    buttonByText('Révoquer').click();

    expect(copy).toHaveBeenCalledWith(LUCAS);
    expect(regenerate).toHaveBeenCalledWith(LUCAS);
    expect(revoke).toHaveBeenCalledWith(LUCAS);
  });

  it('garde « Générer un code d’invitation » désactivé tant que le libellé est vide', async () => {
    await setup();
    const submit = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);

    await fillLabel('   ');
    expect(submit.disabled).toBe(true);
  });

  it('émet le libellé sans espaces de bord', async () => {
    await setup();
    const created = vi.fn();
    fixture.componentInstance.create.subscribe(created);

    await fillLabel('  Inès Moreau ');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(created).toHaveBeenCalledWith('Inès Moreau');
  });

  it('affiche l’erreur du serveur sous le champ', async () => {
    await setup({ serverErrors: { label: 'Libellé invalide' } });
    expect(element.textContent).toContain('Libellé invalide');
  });

  it('propose de réessayer quand le chargement a échoué', async () => {
    await setup({ errorMessage: 'Le serveur ne répond pas.' });
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    buttonByText('Réessayer').click();

    expect(element.textContent).toContain('Le serveur ne répond pas.');
    expect(retry).toHaveBeenCalled();
  });
});
