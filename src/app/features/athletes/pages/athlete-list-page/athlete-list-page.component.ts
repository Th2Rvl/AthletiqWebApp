import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AthleteApiService } from '../../../../core/api/athlete-api.service';
import { fieldErrors, problemCode, problemMessage } from '../../../../core/api/api-problem';
import { GroupApiService } from '../../../../core/api/group-api.service';
import {
  AthleteInvitation,
  AthleteSummary,
  GroupRef,
  Uuid,
} from '../../../../core/api/models/api.models';
import { PagedList } from '../../../../core/api/paged-list';
import { PlanningApiService } from '../../../../core/api/planning-api.service';
import { ATHLETES_AND_GROUPS_TABS } from '../../../../core/navigation/sections';
import { ErrorStateComponent } from '../../../../shared/ui/molecules/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/molecules/page-header/page-header.component';
import { SectionTabsComponent } from '../../../../shared/ui/molecules/section-tabs/section-tabs.component';
import { PageChange } from '../../../../shared/ui/page-change';
import { AthleteTableComponent } from '../../organisms/athlete-table/athlete-table.component';
import {
  InvitationPanelComponent,
  formatInvitationCode,
} from '../../organisms/invitation-panel/invitation-panel.component';

const SEARCH_DEBOUNCE_MS = 300;
/** Le contrat plafonne `size` à 100 : un coach a peu de codes en attente, une page suffit. */
const INVITATION_PAGE_SIZE = 100;

/**
 * Page « Athlètes » (US10 à US12) : codes d'invitation en attente, liste des athlètes suivis
 * avec recherche et filtre par groupe, et retrait d'un athlète.
 */
@Component({
  selector: 'app-athlete-list-page',
  imports: [
    AthleteTableComponent,
    ErrorStateComponent,
    InvitationPanelComponent,
    PageHeaderComponent,
    SectionTabsComponent,
  ],
  templateUrl: './athlete-list-page.component.html',
  styleUrl: './athlete-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteListPageComponent {
  protected readonly sectionTabs = ATHLETES_AND_GROUPS_TABS;

  private readonly api = inject(AthleteApiService);
  private readonly groupApi = inject(GroupApiService);
  private readonly planningApi = inject(PlanningApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  protected readonly groupId = signal<Uuid | null>(null);
  protected readonly groups = signal<GroupRef[]>([]);
  private readonly queryInput = new Subject<string>();

  protected readonly athletes = new PagedList<AthleteSummary>((page) =>
    this.api.list({
      ...page,
      q: this.query(),
      groupId: this.groupId() ?? undefined,
    }),
  );
  protected readonly invitations = new PagedList<AthleteInvitation>((page) =>
    this.api.listInvitations(page),
  );

  protected readonly creating = signal(false);
  protected readonly createErrors = signal<Record<string, string>>({});

  constructor() {
    this.queryInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => {
        this.query.set(query);
        this.athletes.load(0);
      });
    this.athletes.load(0);
    this.invitations.load(0, INVITATION_PAGE_SIZE);
    this.loadGroups();
  }

  protected athletesErrorMessage(): string {
    return problemMessage(this.athletes.error());
  }

  protected invitationsErrorMessage(): string | null {
    return this.invitations.error() && !this.invitations.loading()
      ? problemMessage(this.invitations.error())
      : null;
  }

  protected onQueryChange(query: string): void {
    this.queryInput.next(query);
  }

  protected onGroupChange(groupId: Uuid | null): void {
    this.groupId.set(groupId);
    this.athletes.load(0);
  }

  protected onPage(change: PageChange): void {
    if (change.first !== this.athletes.first() || change.rows !== this.athletes.rows()) {
      this.athletes.load(change.first, change.rows);
    }
  }

  // --- Codes d'invitation (US10) ---

  protected createInvitation(label: string): void {
    this.creating.set(true);
    this.createErrors.set({});
    this.api
      .createInvitation({ label })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitation) => {
          this.creating.set(false);
          this.invitations.reload();
          this.messages.add({
            severity: 'success',
            summary: 'Code d’invitation généré',
            detail: `${formatInvitationCode(invitation.code)} pour ${invitation.label}`,
          });
        },
        error: (error: unknown) => {
          this.creating.set(false);
          const errors = fieldErrors(error);
          if (Object.keys(errors).length > 0) {
            this.createErrors.set(errors);
          } else {
            this.messages.add({ severity: 'error', summary: problemMessage(error) });
          }
        },
      });
  }

  protected async copyCode(invitation: AthleteInvitation): Promise<void> {
    try {
      // Le code est copié sans tiret : c'est la forme que l'athlète saisit.
      await navigator.clipboard.writeText(invitation.code);
      this.messages.add({ severity: 'success', summary: 'Code copié', detail: invitation.label });
    } catch {
      this.messages.add({
        severity: 'warn',
        summary: 'Copie impossible',
        detail: `Sélectionnez le code ${formatInvitationCode(invitation.code)} et copiez-le à la main.`,
      });
    }
  }

  protected confirmRegenerate(invitation: AthleteInvitation): void {
    this.confirmation.confirm({
      header: `Générer un nouveau code pour ${invitation.label} ?`,
      message: "L'ancien code est révoqué immédiatement : il ne pourra plus être utilisé.",
      acceptLabel: 'Générer un nouveau code',
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: 'Générer un nouveau code' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.regenerate(invitation),
    });
  }

  /** « Régénérer » = révoquer l'ancien code puis en créer un avec le même libellé (contrat D1). */
  private regenerate(invitation: AthleteInvitation): void {
    this.api
      .revokeInvitation(invitation.id)
      .pipe(
        switchMap(() => this.api.createInvitation({ label: invitation.label })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (created) => {
          this.invitations.reload();
          this.messages.add({
            severity: 'success',
            summary: 'Nouveau code généré',
            detail: `${formatInvitationCode(created.code)} pour ${created.label}`,
          });
        },
        error: (error: unknown) => this.onInvitationError(error),
      });
  }

  protected confirmRevoke(invitation: AthleteInvitation): void {
    this.confirmation.confirm({
      header: `Révoquer le code de ${invitation.label} ?`,
      message: 'Le code ne pourra plus être utilisé. Les athlètes déjà rattachés ne sont pas touchés.',
      acceptLabel: 'Révoquer le code',
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: 'Révoquer le code', severity: 'danger' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.revoke(invitation),
    });
  }

  private revoke(invitation: AthleteInvitation): void {
    this.api
      .revokeInvitation(invitation.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.invitations.reload();
          this.messages.add({ severity: 'success', summary: 'Code révoqué', detail: invitation.label });
        },
        error: (error: unknown) => this.onInvitationError(error),
      });
  }

  private onInvitationError(error: unknown): void {
    // 404 : le code a été consommé, révoqué ou a expiré entre-temps. On recharge la liste.
    const gone = problemCode(error) === 'INVITATION_NOT_FOUND';
    this.messages.add({ severity: gone ? 'warn' : 'error', summary: problemMessage(error) });
    this.invitations.reload();
  }

  // --- Retrait d'un athlète (US12) ---

  /**
   * Avant la confirmation, on lit le nombre de séances planifiées à venir de ce coach pour
   * l'athlète (`upcoming-count`) : elles seront supprimées avec le lien (#6, P7).
   */
  protected confirmRemove(athlete: AthleteSummary): void {
    this.planningApi
      .upcomingCount(athlete.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count }) => this.askRemove(athlete, count),
        error: (error: unknown) => {
          if (problemCode(error) === 'ATHLETE_NOT_FOUND') {
            this.messages.add({ severity: 'warn', summary: problemMessage(error) });
            this.athletes.reload();
            return;
          }
          // Compte indisponible : la confirmation reste possible, avec une phrase générale.
          this.askRemove(athlete, null);
        },
      });
  }

  private askRemove(athlete: AthleteSummary, upcomingCount: number | null): void {
    const name = `${athlete.firstName} ${athlete.lastName}`;
    this.confirmation.confirm({
      header: `Retirer ${name} ?`,
      message:
        `${name} ne fera plus partie de vos athlètes et sera retiré de tous vos groupes. ` +
        `${plannedSessionsNotice(upcomingCount)} ` +
        'Son compte et ses liens avec ses autres coachs sont conservés. ' +
        'Il pourra vous rejoindre à nouveau avec un nouveau code.',
      acceptLabel: "Retirer l'athlète",
      rejectLabel: 'Annuler',
      acceptButtonProps: { label: "Retirer l'athlète", severity: 'danger' },
      rejectButtonProps: { label: 'Annuler', severity: 'secondary', text: true },
      defaultFocus: 'reject',
      accept: () => this.remove(athlete),
    });
  }

  private remove(athlete: AthleteSummary): void {
    this.api
      .remove(athlete.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: 'Athlète retiré',
            detail: `${athlete.firstName} ${athlete.lastName}`,
          });
          this.athletes.reload();
          this.loadGroups();
        },
        error: (error: unknown) => {
          const gone = problemCode(error) === 'ATHLETE_NOT_FOUND';
          this.messages.add({ severity: gone ? 'warn' : 'error', summary: problemMessage(error) });
          if (gone) {
            this.athletes.reload();
          }
        },
      });
  }

  /** Groupes proposés dans le filtre ; un échec laisse simplement le filtre vide. */
  private loadGroups(): void {
    this.groupApi
      .list({ page: 0, size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) =>
          this.groups.set(page.content.map((group) => ({ id: group.id, name: group.name }))),
        error: () => this.groups.set([]),
      });
  }

  /** « Inviter un athlète » (état vide) : le champ du libellé de code prend le focus. */
  protected focusInvitation(): void {
    const field = document.getElementById('invitation-label');
    field?.scrollIntoView?.({ block: 'center' });
    field?.focus();
  }
}

/** Phrase de la confirmation de retrait sur les séances planifiées à venir supprimées. */
function plannedSessionsNotice(count: number | null): string {
  if (count === null) {
    return 'Ses séances planifiées à venir avec vous seront supprimées ; les séances passées sont conservées.';
  }
  if (count === 0) {
    return "Il n'a aucune séance planifiée à venir avec vous.";
  }
  return count === 1
    ? 'Sa séance planifiée à venir avec vous sera supprimée ; les séances passées sont conservées.'
    : `Ses ${count} séances planifiées à venir avec vous seront supprimées ; les séances passées sont conservées.`;
}
