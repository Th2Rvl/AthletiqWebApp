import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import {
  Organisation,
  OrganisationListQuery,
  OrganisationPayload,
} from '../../../../core/api/models/api.models';
import { OrganisationApiService } from '../../../../core/api/organisation-api.service';
import { PagedList } from '../../../../core/api/paged-list';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { OrganisationFormComponent } from '../../organisms/organisation-form/organisation-form.component';
import {
  OrganisationTableComponent,
  OrganisationTableState,
} from '../../organisms/organisation-table/organisation-table.component';
import { confirmOrganisationDeletion } from '../organisation-dialogs';

const SEARCH_DEBOUNCE_MS = 300;

/** Liste des organisations (US01, US02) : recherche, création, modification et suppression. */
@Component({
  selector: 'app-organisation-list-page',
  imports: [
    DialogModule,
    ErrorStateComponent,
    OrganisationFormComponent,
    OrganisationTableComponent,
  ],
  templateUrl: './organisation-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationListPageComponent {
  private readonly api = inject(OrganisationApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  private readonly sort = signal<NonNullable<OrganisationListQuery['sort']>>({
    field: 'name',
    direction: 'asc',
  });
  private readonly queryInput = new Subject<string>();

  protected readonly list = new PagedList<Organisation>((page) =>
    this.api.list({ ...page, q: this.query(), sort: this.sort() }),
  );

  /** Dialog de création (organisation `null`) ou de modification. */
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Organisation | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string>>({});

  constructor() {
    this.queryInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => this.search(query));
    this.list.load(0);
  }

  protected errorMessage(): string {
    return problemMessage(this.list.error());
  }

  protected onQueryChange(query: string): void {
    this.queryInput.next(query);
  }

  protected search(query: string): void {
    this.query.set(query);
    this.list.load(0);
  }

  protected onTableState(state: OrganisationTableState): void {
    const sort = {
      field: state.sortField,
      direction: state.sortOrder === 1 ? 'asc' : 'desc',
    } as const;
    const sortChanged =
      sort.field !== this.sort().field || sort.direction !== this.sort().direction;
    // `p-table` réémet son état à l'initialisation : on ne recharge que si quelque chose change.
    if (!sortChanged && state.first === this.list.first() && state.rows === this.list.rows()) {
      return;
    }
    this.sort.set(sort);
    this.list.load(sortChanged ? 0 : state.first, state.rows);
  }

  protected openCreate(): void {
    this.openDialog(null);
  }

  protected openEdit(organisation: Organisation): void {
    this.openDialog(organisation);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected save(payload: OrganisationPayload): void {
    const editing = this.editing();
    this.saving.set(true);
    this.serverErrors.set({});
    const request = editing ? this.api.update(editing.id, payload) : this.api.create(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (organisation) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        if (editing) {
          this.list.replace((item) => item.id === organisation.id, organisation);
          this.messages.add({ severity: 'success', summary: 'Organisation modifiée' });
        } else {
          // La position de la nouvelle organisation dépend du tri : on recharge la page.
          this.list.reload();
          this.messages.add({
            severity: 'success',
            summary: 'Organisation créée',
            detail: organisation.name,
          });
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (problemCode(error) === 'ORGANISATION_NOT_FOUND') {
          this.dialogVisible.set(false);
          this.notifyGone();
          return;
        }
        const errors = fieldErrors(error);
        if (Object.keys(errors).length > 0) {
          this.serverErrors.set(errors);
        } else {
          this.messages.add({ severity: 'error', summary: problemMessage(error) });
        }
      },
    });
  }

  protected confirmRemove(organisation: Organisation): void {
    confirmOrganisationDeletion(this.confirmation, organisation, () => this.remove(organisation));
  }

  private remove(organisation: Organisation): void {
    this.api
      .delete(organisation.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: 'Organisation supprimée',
            detail: organisation.name,
          });
          this.list.reload();
        },
        error: (error: unknown) => {
          if (problemCode(error) === 'ORGANISATION_NOT_FOUND') {
            this.notifyGone();
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  private openDialog(organisation: Organisation | null): void {
    this.editing.set(organisation);
    this.serverErrors.set({});
    this.dialogVisible.set(true);
  }

  /** 404 après une modification ou une suppression : l'organisation a disparu entre-temps. */
  private notifyGone(): void {
    this.messages.add({ severity: 'warn', summary: "Cette organisation n'existe plus" });
    this.list.reload();
  }
}
