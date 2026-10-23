import {
  addDays,
  calendarWeeks,
  dayOfWeek,
  fromPickerDate,
  isIsoDate,
  isMonday,
  longDay,
  mondayOf,
  periodLabel,
  periodOf,
  toPickerDate,
  todayIn,
} from './planning-dates';

describe('planning-dates', () => {
  it('reconnaît une date AAAA-MM-JJ réelle', () => {
    expect(isIsoDate('2026-11-12')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('12/11/2026')).toBe(false);
    expect(isIsoDate('2026-11-12T00:00:00Z')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it('ajoute des jours en traversant mois, année et changement d’heure', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    // Passage à l'heure d'hiver à Paris le 25/10/2026 : aucun jour perdu ni doublé.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('trouve le lundi de la semaine, dimanche compris', () => {
    expect(dayOfWeek('2026-11-02')).toBe(0);
    expect(dayOfWeek('2026-11-08')).toBe(6);
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(mondayOf('2026-11-12')).toBe('2026-11-09');
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
    expect(isMonday('2026-11-09')).toBe(true);
    expect(isMonday('2026-11-10')).toBe(false);
  });

  it('découpe 4 semaines du lundi au dimanche', () => {
    const weeks = calendarWeeks('2026-11-05');
    expect(weeks).toHaveLength(4);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0]).toBe('2026-11-02');
    expect(weeks[0][6]).toBe('2026-11-08');
    expect(weeks[3][6]).toBe('2026-11-29');
    expect(periodOf('2026-11-02')).toEqual({ from: '2026-11-02', to: '2026-11-29' });
  });

  it("calcule « aujourd'hui » à Paris, et non en UTC", () => {
    // 23 h 30 UTC le 31/12 = 0 h 30 à Paris le 1/1.
    expect(todayIn('Europe/Paris', new Date(Date.UTC(2026, 11, 31, 23, 30)))).toBe('2027-01-01');
    // 22 h 30 UTC en été = 0 h 30 à Paris le lendemain.
    expect(todayIn('Europe/Paris', new Date(Date.UTC(2026, 6, 14, 22, 30)))).toBe('2026-07-15');
    expect(todayIn('Europe/Paris', new Date(Date.UTC(2026, 6, 14, 21, 30)))).toBe('2026-07-14');
  });

  it('formate en français sans dépendre du fuseau du navigateur', () => {
    expect(longDay('2026-11-12')).toBe('jeudi 12 novembre 2026');
    expect(periodLabel('2026-11-02', '2026-11-29')).toBe('2 nov. – 29 nov. 2026');
    expect(periodLabel('2026-12-28', '2027-01-24')).toBe('28 déc. 2026 – 24 janv. 2027');
  });

  it('passe par les composantes locales pour p-datepicker, sans décalage d’un jour', () => {
    const picked = toPickerDate('2026-11-12');
    expect(picked.getFullYear()).toBe(2026);
    expect(picked.getMonth()).toBe(10);
    expect(picked.getDate()).toBe(12);
    expect(fromPickerDate(picked)).toBe('2026-11-12');
    // Minuit local : en UTC+1, toISOString donnerait le 11. fromPickerDate garde le 12.
    expect(fromPickerDate(new Date(2026, 10, 12, 0, 0))).toBe('2026-11-12');
    expect(fromPickerDate(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12');
  });
});
