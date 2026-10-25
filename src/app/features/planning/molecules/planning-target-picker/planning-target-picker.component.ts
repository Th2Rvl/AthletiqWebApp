import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Uuid } from '../../../../core/api/models/api.models';

/** Cible du calendrier : un athlète suivi ou un groupe du coach. */
export interface PlanningTarget {
  kind: 'athlete' | 'group';
  id: Uuid;
}

export interface PlanningTargetOption {
  id: Uuid;
  label: string;
}

type TargetKind = PlanningTarget['kind'];

/**
 * Sélecteur de la cible du calendrier (planche W4) : sélecteur segmenté « Athlète | Groupe »
 * (`p-selectbutton`), puis un `p-select` sans bordure, filtrable au clavier, qui ne liste que
 * les athlètes ou que les groupes. Une seule fonction : choisir de qui on voit le calendrier.
 */
@Component({
  selector: 'app-planning-target-picker',
  imports: [FormsModule, SelectButtonModule, SelectModule],
  template: `
    <p-selectbutton
      [options]="kindOptions()"
      optionLabel="label"
      optionValue="value"
      optionDisabled="disabled"
      [allowEmpty]="false"
      ariaLabelledBy="planning-target-kind"
      [ngModel]="kind()"
      (ngModelChange)="kind.set($event)"
    />
    <span id="planning-target-kind" class="visually-hidden">Planifier pour</span>
    <label class="visually-hidden" for="planning-target">
      {{ kind() === 'athlete' ? 'Athlète' : 'Groupe' }}
    </label>
    <p-select
      class="target-picker__select"
      inputId="planning-target"
      [options]="options()"
      optionLabel="label"
      optionValue="value"
      [filter]="true"
      filterBy="label"
      [placeholder]="kind() === 'athlete' ? 'Choisir un athlète' : 'Choisir un groupe'"
      [emptyFilterMessage]="
        kind() === 'athlete' ? 'Aucun athlète ne correspond' : 'Aucun groupe ne correspond'
      "
      [emptyMessage]="kind() === 'athlete' ? 'Aucun athlète' : 'Aucun groupe'"
      [ngModel]="value()"
      (onChange)="onChange($event.value)"
    />
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-2);
    }
    .target-picker__select {
      min-width: min(18rem, 100%);
      border-color: transparent;
      font-weight: var(--ath-weight-semibold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningTargetPickerComponent {
  readonly athletes = input<PlanningTargetOption[]>([]);
  readonly groups = input<PlanningTargetOption[]>([]);
  readonly selected = input<PlanningTarget | null>(null);

  readonly targetChange = output<PlanningTarget>();

  /** Liste affichée : celle de la cible choisie, sinon les athlètes s'il y en a. */
  protected readonly kind = linkedSignal<TargetKind>(
    () =>
      this.selected()?.kind ??
      (this.athletes().length === 0 && this.groups().length > 0 ? 'group' : 'athlete'),
  );

  protected readonly kindOptions = computed(() => [
    { label: 'Athlète', value: 'athlete', disabled: this.athletes().length === 0 },
    { label: 'Groupe', value: 'group', disabled: this.groups().length === 0 },
  ]);

  protected readonly value = computed(() => {
    const target = this.selected();
    return target && target.kind === this.kind() ? target.id : null;
  });

  protected readonly options = computed(() =>
    (this.kind() === 'athlete' ? this.athletes() : this.groups()).map((option) => ({
      label: option.label,
      value: option.id,
    })),
  );

  protected onChange(id: string | null): void {
    if (id) {
      this.targetChange.emit({ kind: this.kind(), id });
    }
  }
}
