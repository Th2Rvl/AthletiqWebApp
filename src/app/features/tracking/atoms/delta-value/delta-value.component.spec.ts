import { TestBed } from '@angular/core/testing';
import { DeltaValueComponent } from './delta-value.component';

describe('DeltaValueComponent', () => {
  async function render(value: number | null, unit: string): Promise<string> {
    const fixture = TestBed.createComponent(DeltaValueComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('unit', unit);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent!.trim();
  }

  it('signe les écarts : « +2 rép. », « -5 kg », « -2,5 kg », « +12 % »', async () => {
    expect(await render(2, 'rép.')).toBe('+2 rép.');
    expect(await render(-5, 'kg')).toBe('-5 kg');
    expect(await render(-2.5, 'kg')).toBe('-2,5 kg');
    expect(await render(12, '%')).toBe('+12 %');
  });

  it('affiche un écart nul sans signe et un écart absent par un tiret', async () => {
    expect(await render(0, 'kg')).toBe('0 kg');
    expect(await render(null, 'kg')).toBe('–');
  });
});
