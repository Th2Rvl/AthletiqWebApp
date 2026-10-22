import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Tartan, couleur d'ancrage : rampe primitive commune aux deux apps. */
const tartan = {
  50: '#FCEDE6',
  100: '#F8DDD0',
  200: '#F4B79C',
  300: '#E58F6C',
  400: '#E0643A',
  500: '#C2491D',
  600: '#A63D17',
  700: '#873212',
  800: '#6E270D',
  900: '#4F1C0A',
  950: '#4F1C0A',
};

/**
 * Preset PrimeNG d'Athletiq.
 *
 * Déclinaison des design tokens communs (`src/theme/tokens.scss`, identique dans
 * l'app mobile Th2Rvl/AthletiqApp). Toute modification d'une valeur doit être
 * répercutée dans `tokens.scss` et dans `src/theme/variables.scss` de l'app mobile.
 * Le thème sombre s'active avec la classe `ath-dark` sur <html>.
 */
export const AthletiqPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '6px',
      sm: '6px',
      md: '12px',
      lg: '20px',
      xl: '20px',
    },
  },
  semantic: {
    primary: {
      50: tartan[50],
      100: tartan[100],
      200: tartan[200],
      300: tartan[300],
      400: tartan[400],
      500: tartan[500],
      600: tartan[600],
      700: tartan[700],
      800: tartan[800],
      900: tartan[900],
      950: tartan[950],
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
    },
    colorScheme: {
      light: {
        primary: {
          color: tartan[500],
          contrastColor: '#FFFFFF',
          hoverColor: tartan[600],
          activeColor: tartan[700],
        },
        highlight: {
          background: tartan[50],
          focusBackground: tartan[100],
          color: tartan[700],
          focusColor: tartan[800],
        },
        surface: {
          0: '#FFFFFF',
          50: '#F4F3EF',
          100: '#F0EEE9',
        },
        text: {
          color: '#1C1B19',
          mutedColor: '#5E5A54',
        },
      },
      dark: {
        primary: {
          color: tartan[400],
          contrastColor: '#1A0C06',
          hoverColor: '#EB7A52',
          activeColor: tartan[300],
        },
        highlight: {
          background: '#3A2117',
          focusBackground: '#3A2117',
          color: tartan[200],
          focusColor: tartan[100],
        },
        surface: {
          0: '#1C1B18',
          50: '#131210',
          100: '#25231F',
        },
        text: {
          color: '#F1EFEA',
          mutedColor: '#A9A49A',
        },
      },
    },
  },
});
