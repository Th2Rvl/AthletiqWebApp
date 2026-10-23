import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';

/** Réglage de thème de l'utilisateur (§7 de la charte). */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'athletiq.theme';
const DARK_CLASS = 'ath-dark';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Applique le thème clair ou sombre en posant la classe `ath-dark` sur <html>,
 * classe que le preset PrimeNG et `tokens.scss` utilisent comme sélecteur du thème sombre.
 * « Système » (par défaut) suit `prefers-color-scheme` et réagit à ses changements.
 * Le choix est mémorisé dans le navigateur.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mediaQuery = this.document.defaultView?.matchMedia?.(DARK_QUERY) ?? null;
  private readonly systemDark = signal(this.mediaQuery?.matches ?? false);

  readonly preference = signal<ThemePreference>(this.readPreference());
  readonly isDark = computed(() =>
    this.preference() === 'system' ? this.systemDark() : this.preference() === 'dark',
  );

  constructor() {
    const onSystemChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    this.mediaQuery?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => this.mediaQuery?.removeEventListener('change', onSystemChange));

    effect(() => {
      this.document.documentElement.classList.toggle(DARK_CLASS, this.isDark());
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Stockage indisponible (navigation privée, stockage bloqué) : le choix vaut pour la session.
    }
  }

  private readPreference(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
