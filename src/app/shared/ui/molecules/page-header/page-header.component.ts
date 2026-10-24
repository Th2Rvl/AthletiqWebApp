import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * En-tête d'écran des planches : contexte en 13 px au-dessus du titre (« 34 exercices »,
 * « Séances / Modifier »), titre d'écran en Manrope 700 36 px, et actions de l'écran en haut à
 * droite (une seule action primaire). Les actions sont projetées ; un contexte riche (fil
 * d'Ariane avec lien) se projette avec l'attribut `pageHeaderContext`, un titre éditable avec
 * `pageHeaderTitle`, une ligne de synthèse sous le titre avec `pageHeaderSummary`.
 *
 * Molécule maison : PrimeNG n'a pas d'en-tête de page (`p-toolbar` est une barre d'outils
 * encadrée, sans titre ni hiérarchie typographique).
 */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="page-header__main">
      @if (context(); as text) {
        <span class="page-header__context">{{ text }}</span>
      }
      <ng-content select="[pageHeaderContext]" />
      @if (title(); as text) {
        <h1 class="page-title" [attr.id]="titleId()">{{ text }}</h1>
      }
      <ng-content select="[pageHeaderTitle]" />
      <ng-content select="[pageHeaderSummary]" />
    </div>
    <div class="page-header__actions">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--ath-space-4);
    }
    .page-header__main {
      display: flex;
      flex: 1 1 20rem;
      flex-direction: column;
      gap: var(--ath-space-1);
      min-width: 0;
    }
    .page-header__context {
      color: var(--ath-text-muted);
      font-size: var(--ath-text-small);
      font-variant-numeric: tabular-nums;
    }
    .page-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ath-space-2);
    }
    .page-header__actions:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  /** Titre d'écran (h1). Laissé vide quand le titre est projeté (`pageHeaderTitle`). */
  readonly title = input<string | null>(null);
  /** Contexte court au-dessus du titre (« 34 exercices »). */
  readonly context = input<string | null>(null);
  readonly titleId = input<string | null>(null);
}
