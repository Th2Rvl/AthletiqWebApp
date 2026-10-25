import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { problemCode, problemMessage } from '../../../../core/api/api-problem';
import { SessionReview } from '../../../../core/api/models/api.models';
import { TrackingApiService } from '../../../../core/api/tracking-api.service';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { sessionStatusLabel, sessionStatusSeverity } from '../../../../shared/ui/session-status';
import { longDay } from '../../../planning/planning-dates';
import { PlannedVsPerformedComponent } from '../../organisms/planned-vs-performed/planned-vs-performed.component';
import { SessionFeedbackComponent } from '../../organisms/session-feedback/session-feedback.component';

/**
 * Page d'une séance d'un athlète (`/athletes/:athleteId/seances/:plannedSessionId`) : prévu /
 * réalisé (US28) et ressenti (US29), en lecture seule (Q12). Une séance non faite ou à venir
 * n'affiche que son prévu, avec « Séance non faite » ou « À venir ».
 *
 * `404 PLANNED_SESSION_NOT_FOUND` (séance annulée, d'un autre coach ou d'un lien clos) mène à
 * un état dédié avec le retour au suivi de l'athlète de l'URL.
 */
@Component({
  selector: 'app-session-review-page',
  imports: [
    RouterLink,
    SkeletonModule,
    TagModule,
    EmptyStateComponent,
    ErrorStateComponent,
    PageHeaderComponent,
    PlannedVsPerformedComponent,
    SessionFeedbackComponent,
  ],
  templateUrl: './session-review-page.component.html',
  styleUrl: './session-review-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionReviewPageComponent {
  private readonly api = inject(TrackingApiService);
  private readonly router = inject(Router);

  /** Paramètres de route, liés par `withComponentInputBinding()`. */
  readonly athleteId = input.required<string>();
  readonly plannedSessionId = input.required<string>();

  protected readonly review = signal<SessionReview | null>(null);
  protected readonly loadError = signal<unknown>(null);
  protected readonly notFound = signal(false);
  private request?: Subscription;

  protected readonly athleteName = computed(() => {
    const review = this.review();
    return review ? `${review.athleteFirstName} ${review.athleteLastName}` : '';
  });
  protected readonly dateLabel = computed(() => {
    const review = this.review();
    return review ? longDay(review.date) : '';
  });
  /** « Séance non faite » / « À venir » : seul le prévu est affiché. */
  protected readonly plannedOnlyNotice = computed(() => {
    switch (this.review()?.status) {
      case 'MISSED':
        return 'Séance non faite : seul le prévu est affiché.';
      case 'UPCOMING':
        return 'À venir : seul le prévu est affiché.';
      default:
        return null;
    }
  });

  protected readonly statusLabel = sessionStatusLabel;
  protected readonly statusSeverity = sessionStatusSeverity;

  constructor() {
    effect(() => {
      this.plannedSessionId();
      untracked(() => this.load());
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.review.set(null);
    this.loadError.set(null);
    this.notFound.set(false);
    this.request = this.api.review(this.plannedSessionId()).subscribe({
      next: (review) => this.review.set(review),
      error: (error: unknown) => {
        if (problemCode(error) === 'PLANNED_SESSION_NOT_FOUND') {
          this.notFound.set(true);
        } else {
          this.loadError.set(error);
        }
      },
    });
  }

  protected errorText(error: unknown): string {
    return problemMessage(error);
  }

  protected backToTracking(): void {
    void this.router.navigate(['/athletes', this.athleteId(), 'suivi']);
  }
}
