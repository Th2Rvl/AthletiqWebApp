import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Organisation } from '../../../../core/api/models/api.models';

/**
 * En-tête de la fiche d'une organisation (US05) : nom, description et effectifs, avec les
 * actions sur l'organisation. Le nombre de coachs est mis en avant, les autres chiffres
 * viennent en appui.
 */
@Component({
  selector: 'app-organisation-summary',
  imports: [DatePipe, ButtonModule],
  templateUrl: './organisation-summary.component.html',
  styleUrl: './organisation-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationSummaryComponent {
  readonly organisation = input.required<Organisation>();

  readonly invite = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();
}
