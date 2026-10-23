import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { Subscription } from 'rxjs';
import { AthleteApiService } from '../../../../core/api/athlete-api.service';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import { GroupApiService } from '../../../../core/api/group-api.service';
import {
  AthleteSummary,
  Group,
  GroupMember,
  GroupNamePayload,
  Uuid,
} from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { GroupAthletePickerComponent } from '../../organisms/group-athlete-picker/group-athlete-picker.component';
import { GroupFormComponent } from '../../organisms/group-form/group-form.component';
import { GroupMemberTableComponent } from '../../organisms/group-member-table/group-member-table.component';
import { confirmGroupDeletion } from '../group-dialogs';

/** Le contrat plafonne `size` à 100 : le sélecteur propose les 100 premiers athlètes (tri par nom). */
const PICKER_SIZE = 100;

/**
 * Fiche d'un groupe (US13, US14) : composition, ajout d'athlètes par lot, retrait du groupe,
 * renommage et suppression du groupe.
 */
@Component({
  selector: 'app-group-detail-page',
  imports: [
    RouterLink,
    ButtonModule,
    DialogModule,
    SkeletonModule,
    EmptyStateComponent,
    ErrorStateComponent,
    GroupAthletePickerComponent,
    GroupFormComponent,
    GroupMemberTableComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './group-detail-page.component.html',
  styleUrl: './group-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupDetailPageComponent {
  private readonly api = inject(GroupApiService);
  private readonly athleteApi = inject(AthleteApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route `:groupId`, lié par `withComponentInputBinding()`. */
  readonly groupId = input.required<string>();

  protected readonly group = signal<Group | null>(null);
  protected readonly groupError = signal<unknown>(null);
  protected readonly notFound = signal(false);
  /** Faux tant qu'on ignore si le coach a au moins un athlète ; l'ajout reste alors possible. */
  protected readonly coachHasAthletes = signal(true);

  protected readonly members = new PagedList<GroupMember>((page) =>
    this.api.listMembers(this.groupId(), page),
  );

  protected readonly renameVisible = signal(false);
  protected readonly renaming = signal(false);
  protected readonly renameErrors = signal<Record<string, string>>({});

  protected readonly pickerVisible = signal(false);
  protected readonly candidates = signal<AthleteSummary[]>([]);
  protected readonly candidatesLoaded = signal(false);
  protected readonly candidatesError = signal<unknown>(null);
  protected readonly adding = signal(false);

  private groupRequest?: Subscription;

  constructor() {
    effect(() => {
      this.groupId();
      untracked(() => this.loadAll());
    });
  }

  protected loadAll(): void {
    this.notFound.set(false);
    this.groupError.set(null);
    this.group.set(null);
    this.loadGroup();
    this.members.load(0);
    this.athleteApi
      .list({ page: 0, size: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      // En cas d'échec on laisse l'ajout possible : l'API refusera au besoin.
      .subscribe({
        next: (page) => this.coachHasAthletes.set(page.page.totalElements > 0),
        error: () => this.coachHasAthletes.set(true),
      });
  }

  private loadGroup(): void {
    this.groupRequest?.unsubscribe();
    this.groupRequest = this.api.get(this.groupId()).subscribe({
      next: (group) => this.group.set(group),
      error: (error: unknown) => {
        if (problemCode(error) === 'GROUP_NOT_FOUND') {
          this.notFound.set(true);
        } else {
          this.groupError.set(error);
        }
      },
    });
  }

  protected groupErrorMessage(): string {
    return problemMessage(this.groupError());
  }

  protected membersErrorMessage(): string {
    return problemMessage(this.members.error());
  }

  protected candidatesErrorMessage(): string | null {
    return this.candidatesError() ? problemMessage(this.candidatesError()) : null;
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.members.first() || change.rows !== this.members.rows()) {
      this.members.load(change.first, change.rows);
    }
  }

  protected backToList(): void {
    void this.router.navigate(['/groupes']);
  }

  // --- Renommage et suppression du groupe (US13) ---

  protected openRename(): void {
    this.renameErrors.set({});
    this.renameVisible.set(true);
  }

  protected rename(payload: GroupNamePayload): void {
    this.renaming.set(true);
    this.renameErrors.set({});
    this.api
      .rename(this.groupId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (group) => {
          this.renaming.set(false);
          this.renameVisible.set(false);
          this.group.set(group);
          this.messages.add({ severity: 'success', summary: 'Groupe renommé', detail: group.name });
        },
        error: (error: unknown) => {
          this.renaming.set(false);
          if (problemCode(error) === 'GROUP_NOT_FOUND') {
            this.renameVisible.set(false);
            this.notFound.set(true);
            return;
          }
          const errors = fieldErrors(error);
          if (Object.keys(errors).length > 0) {
            this.renameErrors.set(errors);
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  protected confirmRemoveGroup(): void {
    const group = this.group();
    if (group) {
      confirmGroupDeletion(this.confirmation, group, () => this.removeGroup(group));
    }
  }

  private removeGroup(group: Group): void {
    this.api
      .delete(group.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Groupe supprimé', detail: group.name });
          this.backToList();
        },
        error: (error: unknown) => {
          if (problemCode(error) === 'GROUP_NOT_FOUND') {
            this.notFound.set(true);
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  // --- Composition (US14) ---

  protected openPicker(): void {
    this.pickerVisible.set(true);
    this.loadCandidates();
  }

  protected loadCandidates(): void {
    this.candidatesLoaded.set(false);
    this.candidatesError.set(null);
    this.athleteApi
      .list({ page: 0, size: PICKER_SIZE, excludeGroupId: this.groupId() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.candidates.set(page.content);
          this.candidatesLoaded.set(true);
        },
        error: (error: unknown) => {
          if (problemCode(error) === 'GROUP_NOT_FOUND') {
            this.pickerVisible.set(false);
            this.notFound.set(true);
          } else {
            this.candidatesError.set(error);
          }
        },
      });
  }

  protected addMembers(athleteIds: Uuid[]): void {
    this.adding.set(true);
    this.api
      .addMembers(this.groupId(), { athleteIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (group) => {
          this.adding.set(false);
          this.pickerVisible.set(false);
          this.group.set(group);
          this.members.load(0);
          this.messages.add({
            severity: 'success',
            summary: athleteIds.length > 1 ? 'Athlètes ajoutés au groupe' : 'Athlète ajouté au groupe',
          });
        },
        error: (error: unknown) => {
          this.adding.set(false);
          const code = problemCode(error);
          if (code === 'GROUP_NOT_FOUND') {
            this.pickerVisible.set(false);
            this.notFound.set(true);
          } else if (code === 'ATHLETE_NOT_FOUND') {
            // Un athlète a été retiré entre-temps : rien n'est ajouté (lot atomique).
            this.messages.add({ severity: 'warn', summary: problemMessage(error) });
            this.loadCandidates();
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  protected confirmRemoveMember(member: GroupMember): void {
    const name = `${member.firstName} ${member.lastName}`;
    this.confirmation.confirm({
      header: `Retirer ${name} du groupe ?`,
      message: `${name} reste l'un de vos athlètes : il est seulement retiré de ce groupe.`,
      acceptLabel: 'Retirer du groupe',
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: 'Retirer du groupe', severity: 'danger' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.removeMember(member),
    });
  }

  private removeMember(member: GroupMember): void {
    this.api
      .removeMember(this.groupId(), member.athleteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: 'Athlète retiré du groupe',
            detail: `${member.firstName} ${member.lastName}`,
          });
          this.members.reload();
          this.loadGroup();
        },
        error: (error: unknown) => {
          const code = problemCode(error);
          if (code === 'GROUP_NOT_FOUND') {
            this.notFound.set(true);
            return;
          }
          this.messages.add({
            severity: code === 'GROUP_MEMBER_NOT_FOUND' ? 'warn' : 'error',
            summary: problemMessage(error),
          });
          if (code === 'GROUP_MEMBER_NOT_FOUND') {
            this.members.reload();
          }
        },
      });
  }
}
