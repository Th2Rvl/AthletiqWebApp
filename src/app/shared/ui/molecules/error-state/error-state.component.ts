import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

/**
 * Échec d'un chargement (planche « Composants et états ») : bandeau `p-message` aux couleurs
 * danger de la charte, icône d'alerte, titre en 600 et détail en 13 px tiré du `ProblemDetail`,
 * puis un bouton secondaire de reprise. Le message est choisi par la page d'après le `code`.
 */
@Component({
  selector: 'app-error-state',
  imports: [ButtonModule, MessageModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <p-message severity="error" role="alert">
      <div class="error-state__content">
        <ion-icon name="warning-outline" aria-hidden="true"></ion-icon>
        <div class="error-state__text">
          <strong class="error-state__title">{{ title() }}</strong>
          <span class="error-state__detail">{{ message() }}</span>
        </div>
      </div>
    </p-message>
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
      padding-block: var(--ath-space-2);
    }
    p-message {
      align-self: stretch;
    }
    .error-state__content {
      display: flex;
      gap: var(--ath-space-3);
      padding-block: var(--ath-space-1);
    }
    .error-state__text {
      display: flex;
      flex-direction: column;
      gap: var(--ath-space-1);
    }
    .error-state__title {
      font-weight: var(--ath-weight-semibold);
    }
    .error-state__detail {
      font-size: var(--ath-text-small);
      font-weight: var(--ath-weight-regular);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  /** Détail affiché sous le titre : message du `ProblemDetail`. */
  readonly message = input.required<string>();
  readonly title = input('Chargement impossible');
  readonly retryLabel = input('Réessayer');
  readonly retry = output<void>();
}
