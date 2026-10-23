import {
  CUSTOM_ELEMENTS_SCHEMA,
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { Subscription } from 'rxjs';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import {
  Invitation,
  Organisation,
  OrganisationAthlete,
  OrganisationCoach,
  OrganisationPayload,
} from '../../../../core/api/models/api.models';
import { OrganisationApiService } from '../../../../core/api/organisation-api.service';
import { PagedList } from '../../../../core/api/paged-list';
import { EmptyStateComponent } from '../../../../shared/ui/molecules/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { AthleteMemberTableComponent } from '../../organisms/athlete-member-table/athlete-member-table.component';
import { CoachMemberTableComponent } from '../../organisms/coach-member-table/coach-member-table.component';
import { InvitationFormComponent } from '../../organisms/invitation-form/invitation-form.component';
import { InvitationTableComponent } from '../../organisms/invitation-table/invitation-table.component';
import { OrganisationFormComponent } from '../../organisms/organisation-form/organisation-form.component';
import { OrganisationSummaryComponent } from '../../organisms/organisation-summary/organisation-summary.component';
import { confirmOrganisationDeletion } from '../organisation-dialogs';

export type MemberTab = 'coaches' | 'athletes' | 'invitations';

/**
 * Fiche d'une organisation (US03, US04, US05) : effectifs, coachs, athlètes et invitations
 * en attente ; invitation et retrait de coachs ; modification et suppression de l'organisation.
 */
@Component({
  selector: 'app-organisation-detail-page',
  imports: [
    RouterLink,
    ButtonModule,
    DialogModule,
    SkeletonModule,
    TabsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    AthleteMemberTableComponent,
    CoachMemberTableComponent,
    InvitationFormComponent,
    InvitationTableComponent,
    OrganisationFormComponent,
    OrganisationSummaryComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './organisation-detail-page.component.html',
  styleUrl: './organisation-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationDetailPageComponent {
  private readonly api = inject(OrganisationApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route `:organisationId`, lié par `withComponentInputBinding()`. */
  readonly organisationId = input.required<string>();

  protected readonly organisation = signal<Organisation | null>(null);
  protected readonly organisationError = signal<unknown>(null);
  protected readonly notFound = signal(false);
  private organisationRequest?: Subscription;

  protected readonly coaches = new PagedList<OrganisationCoach>((page) =>
    this.api.listCoaches(this.organisationId(), page),
  );
  protected readonly athletes = new PagedList<OrganisationAthlete>((page) =>
    this.api.listAthletes(this.organisationId(), page),
  );
  protected readonly invitations = new PagedList<Invitation>((page) =>
    this.api.listInvitations(this.organisationId(), page, 'PENDING'),
  );

  protected readonly activeTab = signal<MemberTab>('coaches');

  protected readonly inviteVisible = signal(false);
  protected readonly inviting = signal(false);
  protected readonly inviteErrors = signal<Record<string, string>>({});

  protected readonly editVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly editErrors = signal<Record<string, string>>({});

  protected readonly organisationErrorMessage = computed(() =>
    problemMessage(this.organisationError()),
  );

  constructor() {
    effect(() => {
      this.organisationId();
      untracked(() => this.loadAll());
    });
    this.destroyRef.onDestroy(() => this.organisationRequest?.unsubscribe());
  }

  protected loadAll(): void {
    this.notFound.set(false);
    this.loadOrganisation();
    this.coaches.load(0);
    this.athletes.load(0);
    this.invitations.load(0);
  }

  protected backToList(): void {
    void this.router.navigate(['/organisations']);
  }

  protected listErrorMessage(error: unknown): string {
    return problemMessage(error);
  }

  protected onTabChange(value: string | number | undefined): void {
    if (value === 'coaches' || value === 'athletes' || value === 'invitations') {
      this.activeTab.set(value);
    }
  }

  protected onPage<T>(list: PagedList<T>, change: PageChange): void {
    if (change.first !== list.first() || change.rows !== list.rows()) {
      list.load(change.first, change.rows);
    }
  }

  // Invitation d'un coach (US03)

  protected openInvite(): void {
    this.inviteErrors.set({});
    this.inviteVisible.set(true);
  }

  protected invite(email: string): void {
    this.inviting.set(true);
    this.inviteErrors.set({});
    this.api
      .inviteCoach(this.organisationId(), email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitation) => {
          this.inviting.set(false);
          this.inviteVisible.set(false);
          if (invitation.status === 'ACCEPTED') {
            this.messages.add({
              severity: 'success',
              summary: "Coach rattaché à l'organisation",
              detail: invitation.email,
            });
            this.coaches.reload();
            this.activeTab.set('coaches');
          } else {
            this.messages.add({
              severity: 'success',
              summary: 'Invitation en attente',
              detail: `Aucun compte coach n'utilise ${invitation.email} pour l'instant.`,
            });
            this.activeTab.set('invitations');
          }
          this.invitations.reload();
          this.refreshOrganisation();
        },
        error: (error: unknown) => {
          this.inviting.set(false);
          if (this.handleOrganisationGone(error)) {
            this.inviteVisible.set(false);
            return;
          }
          const errors = fieldErrors(error);
          if (Object.keys(errors).length > 0) {
            this.inviteErrors.set(errors);
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  // Retrait d'un coach (US04)

  protected confirmRemoveCoach(coach: OrganisationCoach): void {
    const name = `${coach.firstName} ${coach.lastName}`;
    this.confirmation.confirm({
      header: `Retirer ${name} de l'organisation ?`,
      message:
        'Son compte est conservé, ainsi que ses liens avec ses athlètes. Seul le rattachement à cette organisation est supprimé.',
      acceptLabel: 'Retirer le coach',
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: 'Retirer le coach', severity: 'danger' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.removeCoach(coach, name),
    });
  }

  private removeCoach(coach: OrganisationCoach, name: string): void {
    this.api
      .removeCoach(this.organisationId(), coach.coachId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Coach retiré', detail: name });
          this.afterMembershipChange();
        },
        error: (error: unknown) => {
          if (this.handleOrganisationGone(error)) {
            return;
          }
          this.messages.add({ severity: 'warn', summary: problemMessage(error) });
          if (problemCode(error) === 'COACH_NOT_MEMBER') {
            this.afterMembershipChange();
          }
        },
      });
  }

  // Annulation d'une invitation (US03)

  protected confirmCancelInvitation(invitation: Invitation): void {
    this.confirmation.confirm({
      header: "Annuler l'invitation ?",
      message: `L'invitation envoyée à ${invitation.email} ne sera plus en attente.`,
      acceptLabel: "Annuler l'invitation",
      rejectLabel: 'Garder',
      acceptButtonProps: { label: "Annuler l'invitation", severity: 'danger' },
      rejectButtonProps: { label: 'Garder', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.cancelInvitation(invitation),
    });
  }

  private cancelInvitation(invitation: Invitation): void {
    this.api
      .cancelInvitation(this.organisationId(), invitation.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: 'Invitation annulée',
            detail: invitation.email,
          });
          this.invitations.reload();
          this.refreshOrganisation();
        },
        error: (error: unknown) => {
          if (this.handleOrganisationGone(error)) {
            return;
          }
          this.messages.add({ severity: 'warn', summary: problemMessage(error) });
          this.invitations.reload();
          this.refreshOrganisation();
        },
      });
  }

  // Modification et suppression de l'organisation (US02)

  protected openEdit(): void {
    this.editErrors.set({});
    this.editVisible.set(true);
  }

  protected save(payload: OrganisationPayload): void {
    this.saving.set(true);
    this.editErrors.set({});
    this.api
      .update(this.organisationId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (organisation) => {
          this.saving.set(false);
          this.editVisible.set(false);
          this.organisation.set(organisation);
          this.messages.add({ severity: 'success', summary: 'Organisation modifiée' });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          if (this.handleOrganisationGone(error)) {
            this.editVisible.set(false);
            return;
          }
          const errors = fieldErrors(error);
          if (Object.keys(errors).length > 0) {
            this.editErrors.set(errors);
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  protected confirmRemove(): void {
    const organisation = this.organisation();
    if (organisation) {
      confirmOrganisationDeletion(this.confirmation, organisation, () => this.remove(organisation));
    }
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
          void this.router.navigate(['/organisations']);
        },
        error: (error: unknown) => {
          if (!this.handleOrganisationGone(error)) {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  // Chargements

  private loadOrganisation(): void {
    this.organisationRequest?.unsubscribe();
    this.organisation.set(null);
    this.organisationError.set(null);
    this.organisationRequest = this.api.get(this.organisationId()).subscribe({
      next: (organisation) => this.organisation.set(organisation),
      error: (error: unknown) => {
        if (isNotFound(error)) {
          this.notFound.set(true);
        } else {
          this.organisationError.set(error);
        }
      },
    });
  }

  /** Met à jour les effectifs de l'en-tête sans masquer la fiche pendant le chargement. */
  private refreshOrganisation(): void {
    this.api
      .get(this.organisationId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (organisation) => this.organisation.set(organisation),
        error: (error: unknown) => this.handleOrganisationGone(error),
      });
  }

  private afterMembershipChange(): void {
    this.coaches.reload();
    this.athletes.reload();
    this.refreshOrganisation();
  }

  /** 404 `ORGANISATION_NOT_FOUND` : l'organisation a été supprimée entre-temps. */
  private handleOrganisationGone(error: unknown): boolean {
    if (problemCode(error) !== 'ORGANISATION_NOT_FOUND') {
      return false;
    }
    this.messages.add({ severity: 'warn', summary: "Cette organisation n'existe plus" });
    this.notFound.set(true);
    return true;
  }
}

/** 404, ou identifiant mal formé (400 `INVALID_PARAMETER`) : la fiche n'existe pas. */
function isNotFound(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === 404 || problemCode(error) === 'INVALID_PARAMETER')
  );
}
