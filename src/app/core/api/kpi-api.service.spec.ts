import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { KpiApiService } from './kpi-api.service';
import { CoachKpis } from './models/api.models';

const API = environment.apiUrl;

describe('KpiApiService', () => {
  let api: KpiApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(KpiApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit les indicateurs sur la période, sans groupe', () => {
    let kpis: CoachKpis | undefined;
    api.kpis({ weeks: 4 }).subscribe((value) => (kpis = value));
    const request = http.expectOne((req) => req.url === `${API}/dashboard/kpis`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('weeks')).toBe('4');
    expect(request.request.params.has('groupId')).toBe(false);
    request.flush({ weeks: 4, watchlist: [] });
    expect(kpis?.weeks).toBe(4);
  });

  it('filtre par groupe', () => {
    api.kpis({ weeks: 12, groupId: 'g-1' }).subscribe();
    const request = http.expectOne((req) => req.url === `${API}/dashboard/kpis`);
    expect(request.request.params.get('weeks')).toBe('12');
    expect(request.request.params.get('groupId')).toBe('g-1');
    request.flush({});
  });
});
