import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { problemCode, problemMessage } from '../../../../core/api/api-problem';
import { WorkoutSummary } from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { WorkoutApiService } from '../../../../core/api/workout-api.service';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { WorkoutTableComponent } from '../../organisms/workout-table/workout-table.component';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Page « Séances » (US18 à US20) : liste des séances du coach, recherche par nom, et accès à
 * l'éditeur (création, modification). Duplication et suppression confirmée se font ici.
 */
@Component({
  selector: 'app-workout-list-page',
  imports: [ErrorStateComponent, WorkoutTableComponent],
  templateUrl: './workout-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutListPageComponent {
  private readonly api = inject(WorkoutApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  private readonly queryInput = new Subject<string>();
  protected readonly duplicatingId = signal<string | null>(null);

  protected readonly workouts = new PagedList<WorkoutSummary>((page) =>
    this.api.list({ ...page, q: this.query() }),
  );

  constructor() {
    this.queryInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => {
        this.query.set(query);
        this.workouts.load(0);
      });
    this.workouts.load(0);
  }

  protected errorMessage(): string {
    return problemMessage(this.workouts.error());
  }

  protected onQueryChange(query: string): void {
    this.queryInput.next(query);
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.workouts.first() || change.rows !== this.workouts.rows()) {
      this.workouts.load(change.first, change.rows);
    }
  }

  protected openCreate(): void {
    void this.router.navigate(['/seances', 'nouvelle']);
  }

  protected openEdit(workout: WorkoutSummary): void {
    void this.router.navigate(['/seances', workout.id]);
  }

  /** Q6 : copie profonde nommée par l'API, puis ouverture de l'éditeur de la copie. */
  protected duplicate(workout: WorkoutSummary): void {
    this.duplicatingId.set(workout.id);
    this.api
      .duplicate(workout.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (copy) => {
          this.duplicatingId.set(null);
          this.messages.add({ severity: 'success', summary: 'Séance dupliquée', detail: copy.name });
          void this.router.navigate(['/seances', copy.id]);
        },
        error: (error: unknown) => {
          this.duplicatingId.set(null);
          this.onActionError(error);
        },
      });
  }

  protected confirmRemove(workout: WorkoutSummary): void {
    this.confirmation.confirm({
      header: `Supprimer « ${workout.name} » ?`,
      message:
        'La séance, ses exercices et ses séries sont supprimés. Les séances déjà planifiées ne changent pas. Cette action est définitive.',
      acceptLabel: 'Supprimer la séance',
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: 'Supprimer la séance', severity: 'danger' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.remove(workout),
    });
  }

  private remove(workout: WorkoutSummary): void {
    this.api
      .delete(workout.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Séance supprimée', detail: workout.name });
          this.workouts.reload();
        },
        error: (error: unknown) => this.onActionError(error),
      });
  }

  /** `404 WORKOUT_NOT_FOUND` : supprimée entre-temps, on le dit et on recharge la liste. */
  private onActionError(error: unknown): void {
    if (problemCode(error) === 'WORKOUT_NOT_FOUND') {
      this.messages.add({ severity: 'warn', summary: problemMessage(error) });
      this.workouts.reload();
    } else {
      this.messages.add({ severity: 'error', summary: problemMessage(error) });
    }
  }
}
