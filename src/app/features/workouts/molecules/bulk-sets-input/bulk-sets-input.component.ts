import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { map } from 'rxjs';
import {
  BulkSets,
  LOAD_MAX,
  LOAD_STEP,
  REPS_MAX,
  REPS_MIN,
  REST_MAX,
  WORKOUT_SETS_MAX,
  halfKgStep,
  integer,
} from '../../workout-form';

/**
 * Raccourci « N séries identiques » (Q1) : « 4 séries de 8 à 60 kg, 90 s de repos ».
 * Une seule fonction : décrire un lot de séries et le demander. L'éditeur remplace alors les
 * séries de l'exercice par ce lot ; chaque série reste modifiable ensuite.
 */
@Component({
  selector: 'app-bulk-sets-input',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule],
  templateUrl: './bulk-sets-input.component.html',
  styleUrl: './bulk-sets-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkSetsInputComponent {
  /** Préfixe unique des identifiants de champs. */
  readonly idPrefix = input.required<string>();
  readonly exerciseName = input.required<string>();
  readonly disabled = input(false);

  readonly apply = output<BulkSets>();

  protected readonly setsMax = WORKOUT_SETS_MAX;
  protected readonly repsMin = REPS_MIN;
  protected readonly repsMax = REPS_MAX;
  protected readonly loadMax = LOAD_MAX;
  protected readonly loadStep = LOAD_STEP;
  protected readonly restMax = REST_MAX;

  protected readonly form = new FormGroup({
    count: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(WORKOUT_SETS_MAX),
      integer,
    ]),
    reps: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(REPS_MIN),
      Validators.max(REPS_MAX),
      integer,
    ]),
    loadKg: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(LOAD_MAX),
      halfKgStep,
    ]),
    restSeconds: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(REST_MAX),
      integer,
    ]),
  });

  protected readonly valid = toSignal(this.form.statusChanges.pipe(map((s) => s === 'VALID')), {
    initialValue: false,
  });
  protected readonly count = toSignal(this.form.controls.count.valueChanges, {
    initialValue: null,
  });

  protected submit(): void {
    if (this.form.invalid || this.disabled()) {
      return;
    }
    const value = this.form.getRawValue();
    this.apply.emit({
      count: value.count!,
      reps: value.reps,
      loadKg: value.loadKg,
      restSeconds: value.restSeconds,
    });
  }
}
