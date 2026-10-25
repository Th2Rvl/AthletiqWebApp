import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { GroupApiService } from '../../../../core/api/group-api.service';
import { KpiApiService } from '../../../../core/api/kpi-api.service';
import { CoachKpis } from '../../../../core/api/models/api.models';
import { DashboardPageComponent } from './dashboard-page.component';

const KPIS: CoachKpis = {
  today: '2026-11-05',
  from: '2026-10-08',
  to: '2026-11-04',
  weeks: 4,
  groupId: null,
  totals: { athleteCount: 2, doneCount: 11, missedCount: 3, completionRate: 79, averageRpe: 7.4 },
  athletes: [
    {
      athleteId: 'ath-3',
      firstName: 'Karim',
      lastName: 'Benali',
      doneCount: 7,
      missedCount: 1,
      completionRate: 88,
      averageRpe: 6.8,
      missedLast7Days: 1,
      watch: true,
    },
    {
      athleteId: 'ath-2',
      firstName: 'Inès',
      lastName: 'Moreau',
      doneCount: 4,
      missedCount: 2,
      completionRate: 67,
      averageRpe: 8.1,
      missedLast7Days: 0,
      watch: true,
    },
  ],
  watchlist: [
    {
      athleteId: 'ath-2',
      firstName: 'Inès',
      lastName: 'Moreau',
      missedCount: 2,
      missedLast7Days: 0,
      completionRate: 67,
      reasons: ['LOW_COMPLETION'],
    },
  ],
};

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let element: HTMLElement;
  let kpis: ReturnType<typeof vi.fn>;
  let messages: MessageService;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(response: Observable<CoachKpis> = of(KPIS)): Promise<void> {
    kpis = vi.fn().mockReturnValue(response);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        { provide: KpiApiService, useValue: { kpis } },
        {
          provide: GroupApiService,
          useValue: {
            list: () =>
              of({
                content: [{ id: 'g-1', name: 'Demi-fond', athleteCount: 4, createdAt: 'x' }],
                page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
              }),
          },
        },
      ],
    });
    messages = TestBed.inject(MessageService);
    vi.spyOn(messages, 'add');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(DashboardPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('lit les indicateurs des 4 dernières semaines, tous athlètes, et les affiche', async () => {
    await setup();

    expect(kpis).toHaveBeenCalledWith({ weeks: 4, groupId: null });
    expect(element.querySelector('h1')?.textContent).toContain('Tableau de bord');
    expect(element.textContent).toContain('79 %');
    expect(element.textContent).toContain('À surveiller');
    expect(element.textContent).toContain('Taux de réalisation bas');
    expect(element.textContent).toContain('Benali Karim');
  });

  it('recharge par période et par groupe', async () => {
    await setup();

    fixture.debugElement.query(By.css('app-period-picker')).triggerEventHandler('weeksChange', 12);
    expect(kpis).toHaveBeenLastCalledWith({ weeks: 12, groupId: null });

    fixture.debugElement
      .query(By.css('p-select'))
      .triggerEventHandler('onChange', { value: 'g-1' });
    expect(kpis).toHaveBeenLastCalledWith({ weeks: 12, groupId: 'g-1' });
  });

  it('sans athlète suivi : « Aucun athlète suivi » et lien vers les athlètes', async () => {
    await setup(
      of({
        ...KPIS,
        totals: {
          athleteCount: 0,
          doneCount: 0,
          missedCount: 0,
          completionRate: null,
          averageRpe: null,
        },
        athletes: [],
        watchlist: [],
      }),
    );

    expect(element.textContent).toContain('Aucun athlète suivi');
    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Athlètes'))!
      .click();
    expect(navigate).toHaveBeenCalledWith(['/athletes']);
  });

  it('groupe supprimé entre-temps : avertit et revient à tous les athlètes', async () => {
    await setup();
    kpis.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({ status: 404, error: { status: 404, code: 'GROUP_NOT_FOUND' } }),
      ),
    );

    fixture.debugElement
      .query(By.css('p-select'))
      .triggerEventHandler('onChange', { value: 'g-1' });
    await fixture.whenStable();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: "Ce groupe n'existe plus" }),
    );
    expect(kpis).toHaveBeenLastCalledWith({ weeks: 4, groupId: null });
  });

  it('échec réseau : message et « Réessayer »', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(element.textContent).toContain('Le serveur ne répond pas');
    kpis.mockReturnValue(of(KPIS));
    [...element.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Réessayer'))!
      .click();
    await fixture.whenStable();

    expect(element.textContent).toContain('79 %');
  });
});
