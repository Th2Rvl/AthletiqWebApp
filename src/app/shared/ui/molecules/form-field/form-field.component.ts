import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MessageModule } from 'primeng/message';

/**
 * Champ de formulaire : libellé, champ projeté (`pInputText`, `pTextarea`…), aide et
 * message d'erreur (`p-message`). Une seule fonction : présenter un champ et son état.
 * L'identifiant de l'erreur (`<inputId>-error`) sert à `aria-describedby` sur le champ projeté.
 */
@Component({
  selector: 'app-form-field',
  imports: [MessageModule],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly optional = input(false);
}
