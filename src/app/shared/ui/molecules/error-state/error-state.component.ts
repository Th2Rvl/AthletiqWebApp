import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

/**
 * Échec d'un chargement : message utile (`p-message`) et action de reprise (`p-button`).
 * Le message est choisi par la page d'après le `code` du `ProblemDetail`.
 */
@Component({
  selector: 'app-error-state',
  imports: [ButtonModule, MessageModule],
  template: `
    <p-message severity="error">{{ message() }}</p-message>
    <button pButton type="button" severity="secondary" outlined (click)="retry.emit()">
      {{ retryLabel() }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ath-space-3);
      padding-block: var(--ath-space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly message = input.required<string>();
  readonly retryLabel = input('Réessayer');
  readonly retry = output<void>();
}
