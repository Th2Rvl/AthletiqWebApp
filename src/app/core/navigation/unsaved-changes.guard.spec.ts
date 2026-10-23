import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { LeaveGuarded, unsavedChangesGuard } from './unsaved-changes.guard';

function run(component: LeaveGuarded) {
  return unsavedChangesGuard(component, null!, null!, null!);
}

describe('unsavedChangesGuard', () => {
  it('laisse partir quand la page le permet', () => {
    expect(run({ canLeave: () => true })).toBe(true);
  });

  it('retient la navigation quand la page refuse', () => {
    expect(run({ canLeave: () => false })).toBe(false);
  });

  it('attend la réponse de la confirmation', async () => {
    const result = run({ canLeave: () => of(false) });
    expect(isObservable(result)).toBe(true);
    expect(await firstValueFrom(result as Observable<boolean>)).toBe(false);
  });
});
