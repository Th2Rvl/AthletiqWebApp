import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import { GroupApiService } from '../../../../core/api/group-api.service';
import { Group, GroupNamePayload } from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { ATHLETES_AND_GROUPS_TABS } from '../../../../core/navigation/sections';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { SectionTabsComponent } from '../../../../shared/ui/molecules/section-tabs/section-tabs.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { GroupFormComponent } from '../../organisms/group-form/group-form.component';
import { GroupTableComponent } from '../../organisms/group-table/group-table.component';
import { confirmGroupDeletion } from '../group-dialogs';

/** Liste des groupes du coach (US13) : création, renommage et suppression. */
@Component({
  selector: 'app-group-list-page',
  imports: [
    ButtonModule,
    DialogModule,
    ErrorStateComponent,
    GroupFormComponent,
    GroupTableComponent,
    PageHeaderComponent,
    SectionTabsComponent,
  ],
  // `ion-icon` : icône Ionicons enregistrée au démarrage (voir core/icons).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrl: './group-list-page.component.scss',
  templateUrl: './group-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupListPageComponent {
  protected readonly sectionTabs = ATHLETES_AND_GROUPS_TABS;
  private readonly api = inject(GroupApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = new PagedList<Group>((page) => this.api.list(page));

  /** Dialog de création (groupe `null`) ou de renommage. */
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Group | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string>>({});

  constructor() {
    this.list.load(0);
  }

  protected errorMessage(): string {
    return problemMessage(this.list.error());
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.list.first() || change.rows !== this.list.rows()) {
      this.list.load(change.first, change.rows);
    }
  }

  protected openCreate(): void {
    this.openDialog(null);
  }

  protected openRename(group: Group): void {
    this.openDialog(group);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected save(payload: GroupNamePayload): void {
    const editing = this.editing();
    this.saving.set(true);
    this.serverErrors.set({});
    const request = editing
      ? this.api.rename(editing.id, payload)
      : this.api.create(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (group) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        // La position du groupe dépend du tri par nom : on recharge la page.
        this.list.reload();
        this.messages.add({
          severity: 'success',
          summary: editing ? 'Groupe renommé' : 'Groupe créé',
          detail: group.name,
        });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (problemCode(error) === 'GROUP_NOT_FOUND') {
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

  protected confirmRemove(group: Group): void {
    confirmGroupDeletion(this.confirmation, group, () => this.remove(group));
  }

  private remove(group: Group): void {
    this.api
      .delete(group.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Groupe supprimé', detail: group.name });
          this.list.reload();
        },
        error: (error: unknown) => {
          if (problemCode(error) === 'GROUP_NOT_FOUND') {
            this.notifyGone();
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  private openDialog(group: Group | null): void {
    this.editing.set(group);
    this.serverErrors.set({});
    this.dialogVisible.set(true);
  }

  /** 404 après un renommage ou une suppression : le groupe a disparu entre-temps. */
  private notifyGone(): void {
    this.messages.add({ severity: 'warn', summary: "Ce groupe n'existe plus" });
    this.list.reload();
  }
}
