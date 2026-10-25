import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntensityBadgeComponent, IntensityScale } from './intensity-badge.component';

describe('IntensityBadgeComponent', () => {
  let fixture: ComponentFixture<IntensityBadgeComponent>;
  let element: HTMLElement;

  async function render(
    scale: IntensityScale,
    value: number | null,
    extra: Record<string, unknown> = {},
  ) {
    fixture = TestBed.createComponent(IntensityBadgeComponent);
    fixture.componentRef.setInput('scale', scale);
    fixture.componentRef.setInput('value', value);
    for (const [name, input] of Object.entries(extra)) {
      fixture.componentRef.setInput(name, input);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('affiche un RPE de 8 au niveau « difficile », lu « RPE 8 sur 10, difficile »', async () => {
    await render('rpe', 8);

    const tag = element.querySelector('p-tag')!;
    expect(tag.classList).toContain('intensity--hard');
    expect(element.textContent).toContain('RPE 8 sur 10, difficile');
  });

  it('place chaque RPE sur la rampe des tokens : 3 facile, 4 modéré, 9 maximal', async () => {
    await render('rpe', 3);
    expect(element.querySelector('p-tag')!.classList).toContain('intensity--easy');
    fixture.componentRef.setInput('value', 4);
    await fixture.whenStable();
    expect(element.querySelector('p-tag')!.classList).toContain('intensity--moderate');
    fixture.componentRef.setInput('value', 9);
    await fixture.whenStable();
    expect(element.querySelector('p-tag')!.classList).toContain('intensity--max');
  });

  it('affiche la fatigue sur 5 avec son niveau en clair', async () => {
    await render('fatigue', 4, { withMax: true, showLabel: true });

    expect(element.querySelector('p-tag')!.classList).toContain('intensity--hard');
    expect(element.textContent).toContain('4/5');
    expect(element.textContent).toContain('élevée');
  });

  it('affiche « Non renseigné » sans ressenti, jamais 0', async () => {
    await render('rpe', null);

    expect(element.querySelector('p-tag')).toBeNull();
    expect(element.textContent?.trim()).toBe('Non renseigné');
    expect(element.textContent).not.toContain('0');
  });
});
