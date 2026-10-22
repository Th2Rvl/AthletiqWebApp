import { addIcons } from 'ionicons';
import { defineCustomElement } from 'ionicons/components/ion-icon.js';
import {
  barbellOutline,
  calendarOutline,
  moonOutline,
  peopleOutline,
  statsChartOutline,
  trophyOutline,
} from 'ionicons/icons';

/**
 * Jeu d'icônes unique d'Athletiq : Ionicons outline, comme l'app mobile.
 * Le web utilise le paquet `ionicons` seul, sans Ionic Framework.
 * Les composants qui affichent `<ion-icon>` déclarent `schemas: [CUSTOM_ELEMENTS_SCHEMA]`.
 */
export function registerIcons(): void {
  defineCustomElement();
  addIcons({
    barbellOutline,
    calendarOutline,
    moonOutline,
    peopleOutline,
    statsChartOutline,
    trophyOutline,
  });
}
