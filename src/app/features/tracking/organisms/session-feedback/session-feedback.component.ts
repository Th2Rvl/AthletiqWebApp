import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SessionFeedback } from '../../../../core/api/models/api.models';
import { IntensityBadgeComponent } from '../../../../shared/ui/atoms/intensity-badge/intensity-badge.component';
import { formatInstant } from '../../tracking-format';

/**
 * Ressenti d'une séance réalisée (US29), en lecture seule (Q12) : RPE sur 10 et fatigue sur 5
 * avec l'échelle et le code couleur communs au mobile, commentaire de l'athlète, date de
 * validation et, après une correction (US14), « Modifiée le … ». Un ressenti absent s'affiche
 * « Non renseigné », jamais 0. Le coach ne peut ni modifier ni répondre.
 */
@Component({
  selector: 'app-session-feedback',
  imports: [IntensityBadgeComponent],
  template: `
    <dl class="feedback__values">
      <div class="feedback__item">
        <dt>RPE</dt>
        <dd>
          <app-intensity-badge
            scale="rpe"
            [value]="feedback().rpe"
            [withMax]="true"
            [showLabel]="true"
          />
        </dd>
      </div>
      <div class="feedback__item">
        <dt>Fatigue</dt>
        <dd>
          <app-intensity-badge
            scale="fatigue"
            [value]="feedback().fatigue"
            [withMax]="true"
            [showLabel]="true"
          />
        </dd>
      </div>
    </dl>

    <div class="feedback__comment">
      <h3 class="feedback__heading">Commentaire de l'athlète</h3>
      @if (feedback().comment; as comment) {
        <p class="feedback__comment-text">{{ comment }}</p>
      } @else {
        <p class="feedback__muted">Aucun commentaire</p>
      }
    </div>

    <p class="feedback__dates">
      Validée le {{ validatedAt() }}
      @if (correctedAt(); as corrected) {
        <span> · Modifiée le {{ corrected }}</span>
      }
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ath-space-4);
    }
    p,
    dl,
    dd {
      margin: 0;
    }
    .feedback__values {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ath-space-6);
    }
    .feedback__item {
      display: flex;
      flex-direction: column;
      gap: var(--ath-space-1);
    }
    dt,
    .feedback__heading {
      color: var(--ath-text-muted);
      font-family: var(--ath-font-text);
      font-size: var(--ath-text-small);
      font-weight: var(--ath-weight-medium);
      letter-spacing: normal;
    }
    .feedback__heading {
      margin: 0 0 var(--ath-space-1);
    }
    .feedback__comment-text {
      max-width: 48rem;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    .feedback__muted,
    .feedback__dates {
      color: var(--ath-text-muted);
    }
    .feedback__dates {
      font-size: var(--ath-text-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionFeedbackComponent {
  readonly feedback = input.required<SessionFeedback>();

  protected readonly validatedAt = computed(() => formatInstant(this.feedback().validatedAt));
  protected readonly correctedAt = computed(() => {
    const corrected = this.feedback().correctedAt;
    return corrected ? formatInstant(corrected) : null;
  });
}
