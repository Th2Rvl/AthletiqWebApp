import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvitationFormComponent } from './invitation-form.component';

describe('InvitationFormComponent', () => {
  let fixture: ComponentFixture<InvitationFormComponent>;
  let element: HTMLElement;
  let submitted: string[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(InvitationFormComponent);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((email) => submitted.push(email));
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  function type(value: string): void {
    const input = element.querySelector<HTMLInputElement>('#invitation-email')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  it('refuse un e-mail mal formé', () => {
    type('coach-at-club.fr');
    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain("L'e-mail n'est pas valide");
  });

  it('refuse un e-mail vide', () => {
    type('');
    expect(element.textContent).toContain("L'e-mail est obligatoire");
  });

  /** E-mail valide de `length` caractères : partie locale courte, domaine en labels de 60. */
  function emailOfLength(length: number): string {
    const prefix = 'coach@';
    const suffix = '.fr';
    const domain = Array.from({ length: length - prefix.length - suffix.length }, (_, index) =>
      (index + 1) % 61 === 0 ? '.' : 'a',
    ).join('');
    return prefix + domain + suffix;
  }

  it('refuse un e-mail de plus de 254 caractères et accepte 254', () => {
    type(emailOfLength(255));
    expect(submitButton().disabled).toBe(true);
    expect(element.textContent).toContain("L'e-mail ne doit pas dépasser 254 caractères");

    const atLimit = emailOfLength(254);
    expect(atLimit).toHaveLength(254);
    type(atLimit);
    expect(submitButton().disabled).toBe(false);
    submitButton().click();
    expect(submitted).toEqual([atLimit]);
  });

  it("émet l'e-mail en minuscules", () => {
    type('Sophie.Bernard@Nantes-Metropole-Athle.fr');
    submitButton().click();
    expect(submitted).toEqual(['sophie.bernard@nantes-metropole-athle.fr']);
  });

  it('affiche le refus du serveur sous le champ', () => {
    type('lucas.girard@athlete.fr');
    fixture.componentRef.setInput('serverErrors', { email: "Ce compte n'est pas un compte coach" });
    fixture.detectChanges();
    expect(element.textContent).toContain("Ce compte n'est pas un compte coach");
  });
});
