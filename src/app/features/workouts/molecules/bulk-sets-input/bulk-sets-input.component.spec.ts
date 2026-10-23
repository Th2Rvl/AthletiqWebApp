import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { BulkSets } from '../../workout-form';
import { BulkSetsInputComponent } from './bulk-sets-input.component';

describe('BulkSetsInputComponent', () => {
  let fixture: ComponentFixture<BulkSetsInputComponent>;
  let emitted: BulkSets[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(BulkSetsInputComponent);
    fixture.componentRef.setInput('idPrefix', 'bulk');
    fixture.componentRef.setInput('exerciseName', 'Squat arrière');
    emitted = [];
    fixture.componentInstance.apply.subscribe((bulk) => emitted.push(bulk));
    await fixture.whenStable();
  });

  function form(): FormGroup {
    return (fixture.componentInstance as unknown as { form: FormGroup }).form;
  }

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('demande 4 séries de 8 à 62,5 kg, charge et repos facultatifs', async () => {
    form().setValue({ count: 4, reps: 8, loadKg: 62.5, restSeconds: null });
    await fixture.whenStable();

    expect(button().textContent).toContain('Créer 4 séries');
    button().click();

    expect(emitted).toEqual([{ count: 4, reps: 8, loadKg: 62.5, restSeconds: null }]);
  });

  it('reste désactivé tant que le lot est invalide (plus de 20 séries, charge hors pas)', async () => {
    form().setValue({ count: 21, reps: 8, loadKg: null, restSeconds: null });
    await fixture.whenStable();
    expect(button().disabled).toBe(true);

    form().setValue({ count: 3, reps: 8, loadKg: 60.2, restSeconds: null });
    await fixture.whenStable();
    expect(button().disabled).toBe(true);
    button().click();
    expect(emitted).toEqual([]);
  });
});
