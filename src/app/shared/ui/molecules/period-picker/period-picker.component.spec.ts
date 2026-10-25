import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PeriodPickerComponent } from './period-picker.component';

describe('PeriodPickerComponent', () => {
  it('propose les durées données et remonte celle choisie', async () => {
    const fixture = TestBed.createComponent(PeriodPickerComponent);
    fixture.componentRef.setInput('choices', [4, 12]);
    fixture.componentRef.setInput('weeks', 4);
    await fixture.whenStable();
    const chosen: number[] = [];
    fixture.componentInstance.weeksChange.subscribe((weeks) => chosen.push(weeks));
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Période');
    expect(element.textContent).toContain('4 sem.');
    expect(element.textContent).toContain('12 sem.');

    fixture.debugElement.query(By.css('p-selectbutton')).triggerEventHandler('ngModelChange', 12);

    expect(chosen).toEqual([12]);
  });
});
