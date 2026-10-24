import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SectionTab {
  label: string;
  path: string;
}

/**
 * Liens entre écrans parallèles d'une même entrée de navigation (« Athlètes » | « Groupes »
 * sous « Athlètes et groupes »), en sélecteur segmenté : piste en retrait, écran courant sur
 * surface avec `aria-current="page"`.
 *
 * Molécule maison : `p-tabs` gère des panneaux dans une même page et `p-selectbutton` une
 * valeur de formulaire ; ici chaque choix est un lien de navigation vers une autre route.
 */
@Component({
  selector: 'app-section-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="section-tabs" [attr.aria-label]="label()">
      @for (tab of tabs(); track tab.path) {
        <a
          class="section-tabs__link"
          [routerLink]="tab.path"
          routerLinkActive="section-tabs__link--active"
          ariaCurrentWhenActive="page"
        >
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    .section-tabs {
      display: inline-flex;
      gap: var(--ath-space-1);
      padding: var(--ath-space-1);
      border-radius: var(--ath-radius-sm);
      background: var(--ath-surface-sunken);
    }
    .section-tabs__link {
      display: inline-flex;
      align-items: center;
      min-height: var(--ath-control-height-sm);
      padding-inline: var(--ath-space-4);
      border-radius: var(--ath-radius-sm);
      color: var(--ath-text-muted);
      font-size: var(--ath-text-small);
      font-weight: var(--ath-weight-medium);
      text-decoration: none;
    }
    .section-tabs__link:hover {
      color: var(--ath-text);
    }
    .section-tabs__link--active {
      background: var(--ath-surface);
      color: var(--ath-text);
      font-weight: var(--ath-weight-semibold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionTabsComponent {
  readonly label = input.required<string>();
  readonly tabs = input.required<SectionTab[]>();
}
