import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset PrimeNG d'Athletiq.
 *
 * Déclinaison des design tokens communs aux deux apps. Toute modification
 * doit être répercutée dans `src/theme/variables.scss` de l'app mobile
 * (Th2Rvl/AthletiqApp).
 */
export const AthletiqPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
  },
});
