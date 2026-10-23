import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * État vide d'une liste : ce qui manque, éventuellement pourquoi, et l'action à faire ensuite.
 *
 * Molécule maison : PrimeNG n'a pas de composant d'état vide (le `emptymessage` de `p-table`
 * n'est qu'un emplacement de template). Elle combine un texte et un `p-button`.
 */
@Component({
  selector: 'app-empty-state',
  imports: [ButtonModule],
  template: `
    <p class="empty-state__message">{{ message() }}</p>
    @if (detail(); as text) {
      <p class="empty-state__detail">{{ text }}</p>
    }
    @if (actionLabel(); as label) {
      <button pButton type="button" (click)="action.emit()">{{ label }}</button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ath-space-3);
      padding: var(--ath-space-6) var(--ath-space-5);
    }
    p {
      margin: 0;
    }
    .empty-state__message {
      font-family: var(--ath-font-display);
      font-size: var(--ath-text-lead);
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
  readonly action = output<void>();
}
