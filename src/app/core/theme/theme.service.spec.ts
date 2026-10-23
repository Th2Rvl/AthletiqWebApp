import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root.classList.remove('ath-dark');
  });

  function create(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('suit le système par défaut', () => {
    const service = create();
    expect(service.preference()).toBe('system');
  });

  it('pose la classe ath-dark en thème sombre et la retire en clair', () => {
    const service = create();

    service.setPreference('dark');
    TestBed.tick();
    expect(root.classList.contains('ath-dark')).toBe(true);

    service.setPreference('light');
    TestBed.tick();
    expect(root.classList.contains('ath-dark')).toBe(false);
  });

  it('mémorise le choix', () => {
    create().setPreference('dark');
    expect(localStorage.getItem('athletiq.theme')).toBe('dark');
  });

  it('relit le choix mémorisé', () => {
    localStorage.setItem('athletiq.theme', 'light');
    expect(create().preference()).toBe('light');
  });

  it('ignore une valeur mémorisée inconnue', () => {
    localStorage.setItem('athletiq.theme', 'sepia');
    expect(create().preference()).toBe('system');
  });
});
