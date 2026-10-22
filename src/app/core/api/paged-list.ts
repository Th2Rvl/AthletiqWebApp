import { DestroyRef, computed, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Page, PageQuery } from './models/api.models';

export const DEFAULT_PAGE_SIZE = 20;

/**
 * État d'une liste paginée côté serveur : éléments, total, position, chargement et erreur.
 *
 * Ce n'est pas un service : chaque page en crée une instance par liste qu'elle affiche
 * (dans un contexte d'injection, pour se désabonner à sa destruction). Les organismes
 * reçoivent ces signaux en `input()` et restent purement présentationnels.
 */
export class PagedList<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  /** Index du premier élément affiché, comme l'attend `p-table`. */
  readonly first = signal(0);
  readonly rows = signal(DEFAULT_PAGE_SIZE);
  readonly loading = signal(false);
  /** Erreur du dernier chargement, `null` s'il a réussi. */
  readonly error = signal<unknown>(null);
  /** Vrai dès qu'un premier chargement a abouti. */
  readonly loaded = signal(false);
  readonly isEmpty = computed(() => this.loaded() && this.total() === 0);

  private subscription?: Subscription;

  constructor(private readonly fetch: (query: PageQuery) => Observable<Page<T>>) {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  /** Charge la page qui commence à `first`. Une requête en cours est abandonnée. */
  load(first = this.first(), rows = this.rows()): void {
    this.subscription?.unsubscribe();
    this.first.set(first);
    this.rows.set(rows);
    this.loading.set(true);
    this.error.set(null);
    this.subscription = this.fetch({ page: Math.floor(first / rows), size: rows }).subscribe({
      next: (page) => {
        // Après une suppression, la dernière page peut être devenue vide : on recule d'une page.
        if (page.content.length === 0 && first > 0 && page.page.totalElements > 0) {
          this.load(Math.max(0, first - rows), rows);
          return;
        }
        this.items.set(page.content);
        this.total.set(page.page.totalElements);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (error: unknown) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  /** Recharge la page courante, par exemple après un `204`. */
  reload(): void {
    this.load();
  }

  /** Remplace un élément déjà affiché par la version renvoyée par l'API (après un `200`). */
  replace(predicate: (item: T) => boolean, item: T): void {
    this.items.update((items) => items.map((current) => (predicate(current) ? item : current)));
  }
}
