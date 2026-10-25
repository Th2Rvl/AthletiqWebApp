import { SectionTab } from '../../shared/ui/molecules/section-tabs/section-tabs.component';

/**
 * Écrans réunis sous l'entrée « Athlètes et groupes » de la barre latérale (décision #70) :
 * on passe de l'un à l'autre par le sélecteur placé dans leur en-tête.
 */
export const ATHLETES_AND_GROUPS_TABS: SectionTab[] = [
  { label: 'Athlètes', path: '/athletes' },
  { label: 'Groupes', path: '/groupes' },
];
