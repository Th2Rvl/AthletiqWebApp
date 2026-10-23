import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { LOAD_MAX, LOAD_STEP, REPS_MAX, REPS_MIN, REST_MAX, SetForm, formatRest } from '../../workout-form';

/** Erreurs à afficher sous les champs d'une série (validation locale ou `400` de l'API). */
export interface SetRowErrors {
  reps: string | null;
  loadKg: string | null;
  restSeconds: string | null;
}

/**
 * Ligne d'une série prévue (Q1 à Q4) : répétitions, charge en kg au pas de 0,5 (vide = poids
 * du corps) et repos en secondes, affiché aussi en mm:ss. Une seule fonction : saisir une
 * série. Composée de `p-inputnumber`, `p-message` et `p-button` ; le groupe de contrôles et
 * les messages d'erreur sont fournis par l'éditeur.
 */
@Component({
  selector: 'app-planned-set-row',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, MessageModule],
  templateUrl: './planned-set-row.component.html',
  styleUrl: './planned-set-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedSetRowComponent {
  readonly group = input.required<SetForm>();
  /** Index de la série dans l'exercice (0 pour la première). */
  readonly index = input.required<number>();
  /** Préfixe unique des identifiants de champs, par exemple « ex-3-set-0 ». */
  readonly idPrefix = input.required<string>();
  /** Nom de l'exercice, pour des libellés accessibles sans ambiguïté. */
  readonly exerciseName = input.required<string>();
  readonly errors = input<SetRowErrors>({ reps: null, loadKg: null, restSeconds: null });
  /** Valeur courante du repos, pour l'affichage en mm:ss. */
  readonly restSeconds = input<number | null>(null);

  readonly remove = output<void>();

  protected readonly repsMin = REPS_MIN;
  protected readonly repsMax = REPS_MAX;
  protected readonly loadMax = LOAD_MAX;
  protected readonly loadStep = LOAD_STEP;
  protected readonly restMax = REST_MAX;

  protected readonly number = computed(() => this.index() + 1);
  protected readonly rest = computed(() => formatRest(this.restSeconds()));

  protected describedBy(field: keyof SetRowErrors): string | undefined {
    return this.errors()[field] ? `${this.idPrefix()}-${field}-error` : undefined;
  }
}
