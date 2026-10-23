import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { AthletiqPreset } from '../theme/athletiq-preset';
import { authInterceptor } from './core/auth/auth.interceptor';
import { PRIMENG_FR } from './core/i18n/primeng-fr';
import { ThemeService } from './core/theme/theme.service';
import { routes } from './app.routes';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    providePrimeNG({
      theme: {
        preset: AthletiqPreset,
        options: { darkModeSelector: '.ath-dark' },
      },
      translation: PRIMENG_FR,
    }),
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ],
};
