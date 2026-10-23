import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/** Page qui peut retenir la navigation quand des modifications ne sont pas enregistrées. */
export interface LeaveGuarded {
  /** `true` pour partir, `false` pour rester, ou la réponse du coach à une confirmation. */
  canLeave(): boolean | Observable<boolean>;
}

/** Garde de sortie : la page décide, et demande confirmation si elle a des modifications. */
export const unsavedChangesGuard: CanDeactivateFn<LeaveGuarded> = (component) =>
  component.canLeave();
