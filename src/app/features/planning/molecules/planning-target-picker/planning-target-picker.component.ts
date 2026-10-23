import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
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

/**
 * Sélecteur de la cible du calendrier : un `p-select` groupé (« Athlètes », « Groupes »),
 * filtrable au clavier. La valeur est encodée « athlete:<id> » ou « group:<id> ».
 */
@Component({
  selector: 'app-planning-target-picker',
  imports: [FormsModule, SelectModule],
  template: `
    <label class="target-picker__label" for="planning-target">Calendrier de</label>
    <p-select
      inputId="planning-target"
      [options]="options()"
      [group]="true"
      optionLabel="label"
      optionValue="value"
      optionGroupLabel="label"
      optionGroupChildren="items"
      [filter]="true"
      filterBy="label"
      placeholder="Choisir un athlète ou un groupe"
      emptyFilterMessage="Aucun athlète ni groupe ne correspond"
      [ngModel]="value()"
      (onChange)="onChange($event.value)"
    />
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ath-space-3);
    }
    .target-picker__label {
      font-family: var(--ath-font-display);
    }
    p-select {
      min-width: min(20rem, 100%);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningTargetPickerComponent {
  readonly athletes = input<PlanningTargetOption[]>([]);
  readonly groups = input<PlanningTargetOption[]>([]);
  readonly selected = input<PlanningTarget | null>(null);

  readonly targetChange = output<PlanningTarget>();

  protected readonly value = computed(() => {
    const target = this.selected();
    return target ? `${target.kind}:${target.id}` : null;
  });

  protected readonly options = computed(() => {
    const groups = [];
    if (this.athletes().length > 0) {
      groups.push({
        label: 'Athlètes',
        items: this.athletes().map((athlete) => ({
          label: athlete.label,
          value: `athlete:${athlete.id}`,
        })),
      });
    }
    if (this.groups().length > 0) {
      groups.push({
        label: 'Groupes',
        items: this.groups().map((group) => ({ label: group.label, value: `group:${group.id}` })),
      });
    }
    return groups;
  });

  protected onChange(value: string | null): void {
    if (!value) {
      return;
    }
    const separator = value.indexOf(':');
    const kind = value.slice(0, separator);
    if (kind === 'athlete' || kind === 'group') {
      this.targetChange.emit({ kind, id: value.slice(separator + 1) });
    }
  }
}
