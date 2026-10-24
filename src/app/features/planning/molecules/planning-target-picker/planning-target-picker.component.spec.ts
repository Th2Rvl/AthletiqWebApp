import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PlanningTarget,
  PlanningTargetOption,
  PlanningTargetPickerComponent,
} from './planning-target-picker.component';

const ATHLETES: PlanningTargetOption[] = [
  { id: 'ath-1', label: 'Durand Lucas' },
  { id: 'ath-2', label: 'Moreau Inès' },
];
const GROUPS: PlanningTargetOption[] = [{ id: 'grp-1', label: 'Haltéro U23' }];

describe('PlanningTargetPickerComponent', () => {
  let fixture: ComponentFixture<PlanningTargetPickerComponent>;
  let element: HTMLElement;
  let emitted: PlanningTarget[];

  async function render(
    selected: PlanningTarget | null = null,
    athletes = ATHLETES,
    groups = GROUPS,
  ): Promise<void> {
    fixture = TestBed.createComponent(PlanningTargetPickerComponent);
    fixture.componentRef.setInput('athletes', athletes);
    fixture.componentRef.setInput('groups', groups);
    fixture.componentRef.setInput('selected', selected);
    emitted = [];
    fixture.componentInstance.targetChange.subscribe((target) => emitted.push(target));
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  /** Accès aux membres protégés : le `p-select` s'ouvre en overlay, absent de jsdom. */
  function picker(): {
    kind: { (): string; set(kind: string): void };
    options: () => { label: string; value: string }[];
    onChange(id: string | null): void;
  } {
    return fixture.componentInstance as never;
  }

  function segment(label: string): HTMLElement {
    const found = [...element.querySelectorAll<HTMLElement>('p-selectbutton [role="button"], p-selectbutton button, p-togglebutton')].find(
      (candidate) => candidate.textContent?.includes(label),
    );
    if (!found) {
      throw new Error(`Choix « ${label} » introuvable`);
    }
    return found;
  }

  it('propose « Athlète » et « Groupe » et liste d’abord les athlètes', async () => {
    await render();

    expect(segment('Athlète')).toBeTruthy();
    expect(segment('Groupe')).toBeTruthy();
    expect(picker().options().map((option) => option.label)).toEqual([
      'Durand Lucas',
      'Moreau Inès',
    ]);
  });

  it('suit la cible choisie : un groupe affiche la liste des groupes', async () => {
    await render({ kind: 'group', id: 'grp-1' });

    expect(picker().kind()).toBe('group');
    expect(picker().options().map((option) => option.label)).toEqual(['Haltéro U23']);
  });

  it('émet un groupe après le passage sur « Groupe »', async () => {
    await render();

    segment('Groupe').click();
    await fixture.whenStable();
    expect(picker().kind()).toBe('group');

    picker().onChange('grp-1');
    expect(emitted).toEqual([{ kind: 'group', id: 'grp-1' }]);
  });

  it('commence par les groupes quand le coach n’a aucun athlète', async () => {
    await render(null, [], GROUPS);

    expect(picker().kind()).toBe('group');
  });
});
