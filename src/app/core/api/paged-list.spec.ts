import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Page, PageQuery } from './models/api.models';
import { PagedList } from './paged-list';

function page<T>(content: T[], totalElements: number, number = 0): Page<T> {
  return { content, page: { size: 20, number, totalElements, totalPages: 1 } };
}

describe('PagedList', () => {
  function create<T>(fetch: (query: PageQuery) => Observable<Page<T>>) {
    return TestBed.runInInjectionContext(() => new PagedList<T>(fetch));
  }

  it('convertit la position du tableau en numéro de page', () => {
    const fetch = vi.fn((_query: PageQuery) => of(page(['a'], 41, 2)));
    const list = create(fetch);

    list.load(40, 20);

    expect(fetch).toHaveBeenCalledWith({ page: 2, size: 20 });
    expect(list.items()).toEqual(['a']);
    expect(list.total()).toBe(41);
    expect(list.loaded()).toBe(true);
  });

  it('expose le chargement puis l’erreur', () => {
    const response = new Subject<Page<string>>();
    const list = create(() => response);

    list.load(0);
    expect(list.loading()).toBe(true);

    response.error(new Error('réseau'));
    expect(list.loading()).toBe(false);
    expect(list.error()).toBeInstanceOf(Error);
  });

  it('recule d’une page quand la page courante est devenue vide', () => {
    const fetch = vi.fn((query: PageQuery) =>
      query.page === 1 ? of(page<string>([], 20, 1)) : of(page(['a'], 20)),
    );
    const list = create(fetch);

    list.load(20, 20);

    expect(fetch).toHaveBeenLastCalledWith({ page: 0, size: 20 });
    expect(list.first()).toBe(0);
    expect(list.items()).toEqual(['a']);
  });

  it('marque la liste vide', () => {
    const list = create(() => of(page<string>([], 0)));
    list.load(0);
    expect(list.isEmpty()).toBe(true);
  });

  it('remplace un élément affiché', () => {
    const list = create(() => of(page([{ id: 1, name: 'a' }], 1)));
    list.load(0);
    list.replace((item) => item.id === 1, { id: 1, name: 'b' });
    expect(list.items()).toEqual([{ id: 1, name: 'b' }]);
  });

  it('garde l’erreur jusqu’au prochain chargement', () => {
    let fail = true;
    const list = create(() => (fail ? throwError(() => new Error('x')) : of(page(['a'], 1))));
    list.load(0);
    expect(list.error()).not.toBeNull();
    fail = false;
    list.reload();
    expect(list.error()).toBeNull();
  });
});
