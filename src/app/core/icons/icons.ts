import { addIcons } from 'ionicons';
import { defineCustomElement } from 'ionicons/components/ion-icon.js';
import {
  addOutline,
  arrowBackOutline,
  barbellOutline,
  businessOutline,
  calendarOutline,
  chatbubbleOutline,
  checkmarkOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  closeOutline,
  copyOutline,
  createOutline,
  desktopOutline,
  documentTextOutline,
  moonOutline,
  peopleOutline,
  personOutline,
  reorderTwoOutline,
  searchOutline,
  statsChartOutline,
  sunnyOutline,
  trashOutline,
  trophyOutline,
  warningOutline,
} from 'ionicons/icons';

/**
 * Jeu d'icônes unique d'Athletiq : Ionicons outline, comme l'app mobile.
 * Le web utilise le paquet `ionicons` seul, sans Ionic Framework.
 * Les composants qui affichent `<ion-icon>` déclarent `schemas: [CUSTOM_ELEMENTS_SCHEMA]`.
 */
export function registerIcons(): void {
  defineCustomElement();
  addIcons({
    addOutline,
    arrowBackOutline,
    barbellOutline,
    businessOutline,
    calendarOutline,
    chatbubbleOutline,
    checkmarkOutline,
    chevronBackOutline,
    chevronDownOutline,
    chevronForwardOutline,
    chevronUpOutline,
    closeOutline,
    copyOutline,
    createOutline,
    desktopOutline,
    documentTextOutline,
    moonOutline,
    peopleOutline,
    personOutline,
    reorderTwoOutline,
    searchOutline,
    statsChartOutline,
    sunnyOutline,
    trashOutline,
    trophyOutline,
    warningOutline,
  });
}
