import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Organisation, OrganisationPayload } from '../../../../core/api/models/api.models';
import { OrganisationFormComponent } from './organisation-form.component';

const RENNES: Organisation = {
  id: 'org-1',
  name: 'Stade Rennais Athlétisme',
  description: "Club d'athlétisme rennais : sprint, demi-fond et épreuves combinées.",
  coachCount: 2,
  athleteCount: 0,
  pendingInvitationCount: 1,
  createdAt: '2026-10-22T08:15:30.123456Z',
  updatedAt: '2026-10-22T08:15:30.123456Z',
};

describe('OrganisationFormComponent', () => {
  let fixture: ComponentFixture<OrganisationFormComponent>;
  let element: HTMLElement;
  let submitted: OrganisationPayload[];

  async function setup(organisation: Organisation | null = null): Promise<void> {
    fixture = TestBed.createComponent(OrganisationFormComponent);
    fixture.componentRef.setInput('organisation', organisation);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function type(selector: string, value: string): void {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  it('désactive la validation tant que le nom est vide', async () => {
    await setup();
    expect(submitButton().disabled).toBe(true);
  });

  it.each([
    ['   ', 'Le nom est obligatoire'],
    [' a ', 'Le nom doit contenir entre 2 et 100 caractères'],
    ['x'.repeat(101), 'Le nom doit contenir entre 2 et 100 caractères'],
  ])('refuse le nom « %s »', async (name, message) => {
    await setup();
    type('#organisation-name', name);
    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain(message);
  });

  it('refuse une description de plus de 500 caractères', async () => {
    await setup();
    type('#organisation-name', 'Trail Club du Morbihan');
    type('#organisation-description', 'x'.repeat(501));
    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain('La description ne doit pas dépasser 500 caractères');
  });

  it("compte la description après trim, comme l'API", async () => {
    await setup();
    type('#organisation-name', 'Trail Club du Morbihan');
    const description = 'x'.repeat(500);
    type('#organisation-description', `   ${description}   `);

    expect(submitButton().disabled).toBe(false);
    expect(element.textContent).not.toContain('La description ne doit pas dépasser');
    submitButton().click();
    expect(submitted).toEqual([{ name: 'Trail Club du Morbihan', description }]);
  });

  it('émet des valeurs normalisées : trim et description vide à null', async () => {
    await setup();
    type('#organisation-name', '  Nantes Métropole Athlétisme  ');
    type('#organisation-description', '   ');
    submitButton().click();
    expect(submitted).toEqual([{ name: 'Nantes Métropole Athlétisme', description: null }]);
  });

  it('pré-remplit le formulaire en modification', async () => {
    await setup(RENNES);
    expect(element.querySelector<HTMLInputElement>('#organisation-name')!.value).toBe(RENNES.name);
    expect(submitButton().textContent).toContain('Enregistrer les modifications');
  });

  it("affiche l'erreur du serveur sous le champ, puis l'efface quand on corrige", async () => {
    await setup();
    type('#organisation-name', 'stade rennais athlétisme');
    fixture.componentRef.setInput('serverErrors', { name: 'Une organisation porte déjà ce nom' });
    fixture.detectChanges();
    expect(element.textContent).toContain('Une organisation porte déjà ce nom');

    type('#organisation-name', 'Stade Rennais Athlétisme Jeunes');
    expect(element.textContent).not.toContain('Une organisation porte déjà ce nom');
  });
});
