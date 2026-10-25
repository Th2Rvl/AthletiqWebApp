import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * État vide d'une liste : ce qui manque, éventuellement pourquoi, et l'action à faire ensuite
 * (planche « Composants et états » : titre Manrope 700 22 px, texte secondaire, bouton
 * primaire, bloc sur surface arrondi 12 px).
 *
 * Molécule maison : PrimeNG n'a pas de composant d'état vide (le `emptymessage` de `p-table`
 * n'est qu'un emplacement de template). Elle combine un texte et un `p-button`.
 */
@Component({
  selector: 'app-empty-state',
  imports: [ButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <p class="empty-state__message">{{ message() }}</p>
    @if (detail(); as text) {
      <p class="empty-state__detail">{{ text }}</p>
    }
    @if (actionLabel(); as label) {
      <button pButton type="button" (click)="action.emit()">
        @if (actionIcon(); as icon) {
          <ion-icon [name]="icon" aria-hidden="true"></ion-icon>
        }
        {{ label }}
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ath-space-3);
      padding: var(--ath-space-6);
      border-radius: var(--ath-radius-md);
      background: var(--ath-surface);
    }
    p {
      margin: 0;
      max-width: 40rem;
    }
    .empty-state__message {
      font-family: var(--ath-font-display);
      font-size: var(--ath-text-section);
      font-weight: var(--ath-weight-bold);
      line-height: var(--ath-line-height-tight);
      letter-spacing: var(--ath-tracking-snug);
    }
    .empty-state__detail {
      color: var(--ath-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly detail = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  /** Icône Ionicons du bouton (`add-outline` pour une création). */
  readonly actionIcon = input<string | null>(null);
  readonly action = output<void>();
}
