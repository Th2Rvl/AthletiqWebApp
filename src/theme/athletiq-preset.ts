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
 * Rampes neutres chaudes, une par schéma, dans l'ordre où Aura les lit.
 *
 * Aura n'utilise pas les mêmes crans en clair et en sombre : en clair, 0 est le fond des
 * contenus et des champs, 200 la bordure de contenu, 300 la bordure de champ, 500 le texte
 * secondaire, 700 le texte ; en sombre, 0 est le TEXTE (couleur du texte saisi comprise),
 * 400 le texte secondaire, 600 la bordure de champ, 700 la bordure de contenu, 800 le survol,
 * 900 le fond des contenus et 950 celui des champs. Les crans qui portent un token de la charte
 * en reprennent la valeur (`tokens.scss`) ; les autres sont des nuances intermédiaires de la même
 * teinte, propres à PrimeNG, pour qu'aucun gris bleuté (slate) ou zinc d'Aura ne subsiste.
 */
const warmLight = {
  0: '#FFFFFF', // surface
  50: '#F4F3EF', // bg
  100: '#F0EEE9', // surface-sunken
  200: '#E2DFD8', // line
  300: '#C9C5BC', // line-strong
  400: '#A29D94',
  500: '#5E5A54', // text-muted
  600: '#4A4640',
  700: '#36332E',
  800: '#25231F',
  900: '#1C1B19', // text
  950: '#131210',
};
const warmDark = {
  0: '#F1EFEA', // text
  50: '#E9E6E0',
  100: '#DCD8D0',
  200: '#CFCAC0',
  300: '#C2BDB3',
  400: '#A9A49A', // text-muted
  500: '#77726A',
  600: '#47433C', // line-strong
  700: '#2F2C27', // line
  800: '#25231F', // surface-sunken
  900: '#1C1B18', // surface
  950: '#131210', // bg
};

/**
 * Couleurs d'état d'une sévérité PrimeNG, lues dans les tokens sémantiques de `tokens.scss`.
 * Les variables CSS changent de valeur avec la classe `ath-dark` : une seule déclaration
 * couvre les deux thèmes.
 */
const state = (name: 'success' | 'warning' | 'danger') => ({
  solid: `var(--ath-${name})`,
  soft: `var(--ath-${name}-soft)`,
  text: `var(--ath-${name}-text)`,
});
const success = state('success');
const warning = state('warning');
const danger = state('danger');

/** Bouton plein d'une couleur d'état : le survol prend le texte foncé (clair) ou éclairci (sombre). */
const solidButton = (s: ReturnType<typeof state>) => ({
  background: s.solid,
  hoverBackground: s.text,
  activeBackground: s.text,
  borderColor: s.solid,
  hoverBorderColor: s.text,
  activeBorderColor: s.text,
  color: 'var(--ath-on-primary)',
  hoverColor: 'var(--ath-on-primary)',
  activeColor: 'var(--ath-on-primary)',
  focusRing: { color: '{primary.color}', shadow: 'none' },
});

/** Bouton contour ou texte d'une couleur d'état (« Supprimer » en danger outlined). */
const quietButton = (s: ReturnType<typeof state>) => ({
  hoverBackground: s.soft,
  activeBackground: s.soft,
  borderColor: s.solid,
  color: s.solid,
});

/** Bandeau (`p-message`) ou toast d'une couleur d'état : fond doux, texte foncé de la même teinte. */
const softBlock = (s: ReturnType<typeof state>) => ({
  background: s.soft,
  borderColor: s.soft,
  color: s.text,
  shadow: 'none',
  closeButton: { hoverBackground: 'var(--ath-surface)', focusRing: { color: '{primary.color}', shadow: 'none' } },
  outlined: { color: s.text, borderColor: s.solid },
  simple: { color: s.solid },
});

/**
 * Preset PrimeNG d'Athletiq.
 *
 * Déclinaison des design tokens communs (`src/theme/tokens.scss`, identique dans
 * l'app mobile Th2Rvl/AthletiqApp). Les tokens sémantiques et ceux des composants pointent
 * vers les variables CSS `--ath-*` : `tokens.scss` reste l'unique source des valeurs et le
 * thème sombre (classe `ath-dark` sur <html>) s'applique sans second jeu de valeurs.
 * Les dimensions propres au web (hauteur des contrôles, barre latérale, navigation, icônes)
 * viennent de `src/theme/web-tokens.scss`, qui n'existe que dans ce dépôt.
 * Seules les rampes primitives (tartan, neutres chauds) sont écrites ici en hexadécimal.
 * Toute modification d'une valeur commune doit être répercutée dans `tokens.scss` et dans
 * `src/theme/variables.scss` de l'app mobile.
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
    // Public Sans 16 px pour tous les composants (Aura : 14 px).
    typography: {
      fontSize: '1rem',
      lineHeight: 'var(--ath-line-height-body)',
    },
    iconSize: '1rem',
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
      color: 'var(--ath-primary)',
      contrastColor: 'var(--ath-on-primary)',
      hoverColor: 'var(--ath-primary-hover)',
      activeColor: 'var(--ath-primary-hover)',
    },
    focusRing: {
      width: 'var(--ath-focus-width)',
      style: 'solid',
      color: '{primary.color}',
      offset: 'var(--ath-focus-offset)',
      shadow: 'none',
    },
    highlight: {
      background: 'var(--ath-primary-soft)',
      focusBackground: 'var(--ath-primary-soft)',
      color: 'var(--ath-primary-soft-text)',
      focusColor: 'var(--ath-primary-soft-text)',
    },
    text: {
      color: 'var(--ath-text)',
      hoverColor: 'var(--ath-text)',
      mutedColor: 'var(--ath-text-muted)',
      hoverMutedColor: 'var(--ath-text)',
    },
    // Champ de 40 px : 24 px de ligne + 2 × 7 px + 2 × 1 px de bordure ; arrondi 6 px.
    formField: {
      paddingX: '0.75rem',
      paddingY: '0.4375rem',
      sm: { fontSize: '0.875rem', paddingX: '0.625rem', paddingY: '0.3125rem' },
      borderRadius: '{border.radius.sm}',
      // Anneau de focus de la charte sur les champs aussi (Aura n'en met pas).
      focusRing: {
        width: 'var(--ath-focus-width)',
        style: 'solid',
        color: '{primary.color}',
        offset: 'var(--ath-focus-offset)',
        shadow: 'none',
      },
      background: 'var(--ath-surface)',
      disabledBackground: 'var(--ath-surface-sunken)',
      filledBackground: 'var(--ath-surface-sunken)',
      filledHoverBackground: 'var(--ath-surface-sunken)',
      filledFocusBackground: 'var(--ath-surface-sunken)',
      borderColor: 'var(--ath-line-strong)',
      hoverBorderColor: 'var(--ath-text-muted)',
      focusBorderColor: '{primary.color}',
      invalidBorderColor: 'var(--ath-danger)',
      color: 'var(--ath-text)',
      disabledColor: 'var(--ath-text-muted)',
      placeholderColor: 'var(--ath-text-muted)',
      invalidPlaceholderColor: 'var(--ath-danger)',
      floatLabelColor: 'var(--ath-text-muted)',
      floatLabelFocusColor: '{primary.color}',
      floatLabelActiveColor: 'var(--ath-text-muted)',
      iconColor: 'var(--ath-text-muted)',
      shadow: 'none',
    },
    content: {
      background: 'var(--ath-surface)',
      hoverBackground: 'var(--ath-surface-sunken)',
      borderColor: 'var(--ath-line)',
      color: 'var(--ath-text)',
      hoverColor: 'var(--ath-text)',
    },
    list: {
      option: {
        focusBackground: 'var(--ath-surface-sunken)',
        color: 'var(--ath-text)',
        focusColor: 'var(--ath-text)',
        icon: { color: 'var(--ath-text-muted)', focusColor: 'var(--ath-text)' },
      },
      optionGroup: { color: 'var(--ath-text-muted)' },
    },
    navigation: {
      item: {
        focusBackground: 'var(--ath-surface-sunken)',
        activeBackground: 'var(--ath-primary-soft)',
        color: 'var(--ath-text)',
        focusColor: 'var(--ath-text)',
        activeColor: 'var(--ath-primary-soft-text)',
        icon: {
          color: 'var(--ath-text-muted)',
          focusColor: 'var(--ath-text)',
          activeColor: 'var(--ath-primary-soft-text)',
        },
      },
    },
    // Ce qui flotte (liste déroulante, popover, modale, panneau) : surface + seule ombre admise.
    overlay: {
      select: {
        borderRadius: '{border.radius.sm}',
        background: 'var(--ath-surface)',
        borderColor: 'var(--ath-line)',
        color: 'var(--ath-text)',
        shadow: 'var(--ath-shadow-overlay)',
      },
      popover: {
        background: 'var(--ath-surface)',
        borderColor: 'var(--ath-line)',
        color: 'var(--ath-text)',
        shadow: 'var(--ath-shadow-overlay)',
      },
      modal: {
        padding: '1.5rem',
        background: 'var(--ath-surface)',
        borderColor: 'var(--ath-line)',
        color: 'var(--ath-text)',
        shadow: 'var(--ath-shadow-overlay)',
      },
      navigation: { shadow: 'var(--ath-shadow-overlay)' },
    },
    colorScheme: {
      light: { surface: warmLight },
      dark: { surface: warmDark },
    },
  },
  components: {
    // Boutons de 40 px, arrondi 6 px. Primaire : tartan ; secondaire : tonal (surface en retrait) ;
    // contour : bordure line-strong ; danger contour pour « Supprimer ». Bouton icône 36 px en `sm`.
    button: {
      root: {
        iconOnlyWidth: 'var(--ath-control-height)',
        sm: { iconOnlyWidth: 'var(--ath-control-height-sm)' },
        label: { fontWeight: 'var(--ath-weight-medium)' },
        secondary: {
          background: 'var(--ath-surface-sunken)',
          hoverBackground: 'var(--ath-line)',
          activeBackground: 'var(--ath-line-strong)',
          borderColor: 'var(--ath-surface-sunken)',
          hoverBorderColor: 'var(--ath-line)',
          activeBorderColor: 'var(--ath-line-strong)',
          color: 'var(--ath-text)',
          hoverColor: 'var(--ath-text)',
          activeColor: 'var(--ath-text)',
          focusRing: { color: '{primary.color}', shadow: 'none' },
        },
        success: solidButton(success),
        warn: solidButton(warning),
        danger: solidButton(danger),
      },
      outlined: {
        primary: {
          hoverBackground: 'var(--ath-primary-soft)',
          activeBackground: 'var(--ath-primary-soft)',
          borderColor: '{primary.color}',
          color: 'var(--ath-link)',
        },
        secondary: {
          hoverBackground: 'var(--ath-surface-sunken)',
          activeBackground: 'var(--ath-line)',
          borderColor: 'var(--ath-line-strong)',
          color: 'var(--ath-text)',
        },
        success: quietButton(success),
        warn: quietButton(warning),
        danger: quietButton(danger),
      },
      text: {
        primary: {
          hoverBackground: 'var(--ath-primary-soft)',
          activeBackground: 'var(--ath-primary-soft)',
          color: 'var(--ath-link)',
        },
        // Boutons icône des lignes (crayon, corbeille) : texte secondaire, survol en retrait.
        secondary: {
          hoverBackground: 'var(--ath-surface-sunken)',
          activeBackground: 'var(--ath-line)',
          color: 'var(--ath-text-muted)',
        },
        success: quietButton(success),
        warn: quietButton(warning),
        danger: quietButton(danger),
      },
      link: {
        color: 'var(--ath-link)',
        hoverColor: 'var(--ath-link)',
        activeColor: 'var(--ath-link)',
      },
    },
    // Statuts : arrondi 6, 13 px, graisse 500, couleurs d'état de la charte (jamais celles d'Aura).
    tag: {
      root: {
        fontSize: 'var(--ath-text-small)',
        fontWeight: 'var(--ath-weight-medium)',
        padding: '0.25rem 0.625rem',
        gap: '0.375rem',
        borderRadius: '{border.radius.sm}',
      },
      icon: { size: 'var(--ath-icon-size-sm)' },
      primary: { background: 'var(--ath-primary-soft)', color: 'var(--ath-primary-soft-text)' },
      secondary: { background: 'var(--ath-surface-sunken)', color: 'var(--ath-text-muted)' },
      info: { background: 'var(--ath-surface-sunken)', color: 'var(--ath-text)' },
      success: { background: success.soft, color: success.text },
      warn: { background: warning.soft, color: warning.text },
      danger: { background: danger.soft, color: danger.text },
      contrast: { background: 'var(--ath-text)', color: 'var(--ath-surface)' },
    },
    message: {
      root: { borderRadius: '{border.radius.sm}' },
      text: { fontWeight: 'var(--ath-weight-medium)', sm: { fontSize: 'var(--ath-text-small)' } },
      info: {
        background: 'var(--ath-surface-sunken)',
        borderColor: 'var(--ath-surface-sunken)',
        color: 'var(--ath-text)',
        shadow: 'none',
        closeButton: { hoverBackground: 'var(--ath-line)', focusRing: { color: '{primary.color}', shadow: 'none' } },
        outlined: { color: 'var(--ath-text)', borderColor: 'var(--ath-line-strong)' },
        simple: { color: 'var(--ath-text-muted)' },
      },
      secondary: {
        background: 'var(--ath-surface-sunken)',
        borderColor: 'var(--ath-surface-sunken)',
        color: 'var(--ath-text-muted)',
        shadow: 'none',
        closeButton: { hoverBackground: 'var(--ath-line)', focusRing: { color: '{primary.color}', shadow: 'none' } },
        outlined: { color: 'var(--ath-text-muted)', borderColor: 'var(--ath-line-strong)' },
        simple: { color: 'var(--ath-text-muted)' },
      },
      success: softBlock(success),
      warn: softBlock(warning),
      error: softBlock(danger),
    },
    toast: {
      root: { borderRadius: '{border.radius.sm}' },
      info: {
        background: 'var(--ath-surface)',
        borderColor: 'var(--ath-line)',
        color: 'var(--ath-text)',
        detailColor: 'var(--ath-text-muted)',
        shadow: 'var(--ath-shadow-overlay)',
        closeButton: { hoverBackground: 'var(--ath-surface-sunken)', focusRing: { color: '{primary.color}', shadow: 'none' } },
      },
      success: { ...softBlock(success), detailColor: 'var(--ath-text)', shadow: 'var(--ath-shadow-overlay)' },
      warn: { ...softBlock(warning), detailColor: 'var(--ath-text)', shadow: 'var(--ath-shadow-overlay)' },
      error: { ...softBlock(danger), detailColor: 'var(--ath-text)', shadow: 'var(--ath-shadow-overlay)' },
    },
    // Squelettes à la couleur de la charte, à la forme du contenu.
    skeleton: {
      root: {
        borderRadius: '{border.radius.sm}',
        background: 'var(--ath-skeleton)',
        animationBackground: 'color-mix(in srgb, var(--ath-surface) 40%, transparent)',
      },
    },
    // Tableau sur surface : en-tête sans fond, 13 px muted 500, cellules 12/20 px, séparateurs line.
    datatable: {
      root: { borderColor: 'var(--ath-line)' },
      header: { background: 'transparent', borderColor: 'var(--ath-line)', padding: '0.75rem 1.25rem' },
      headerCell: {
        background: 'transparent',
        hoverBackground: 'var(--ath-surface-sunken)',
        color: 'var(--ath-text-muted)',
        hoverColor: 'var(--ath-text)',
        borderColor: 'var(--ath-line)',
        padding: '0.75rem 1.25rem',
      },
      columnTitle: { fontWeight: 'var(--ath-weight-medium)', fontSize: 'var(--ath-text-small)' },
      row: {
        background: 'transparent',
        hoverBackground: 'var(--ath-surface-sunken)',
        selectedBackground: 'var(--ath-primary-soft)',
        selectedColor: 'var(--ath-primary-soft-text)',
        stripedBackground: 'var(--ath-surface-sunken)',
      },
      bodyCell: { borderColor: 'var(--ath-line)', padding: '0.75rem 1.25rem' },
      footerCell: { background: 'transparent', borderColor: 'var(--ath-line)', padding: '0.75rem 1.25rem' },
      footer: { background: 'transparent', borderColor: 'var(--ath-line)', padding: '0.75rem 1.25rem' },
    },
    paginator: {
      root: { background: 'transparent' },
      navButton: { borderRadius: '{border.radius.sm}' },
    },
    // Sélecteur segmenté (« Athlète | Groupe ») : piste en retrait, choix actif sur surface.
    togglebutton: {
      root: {
        fontSize: 'var(--ath-text-small)',
        borderRadius: '{border.radius.sm}',
        background: 'var(--ath-surface-sunken)',
        checkedBackground: 'var(--ath-surface-sunken)',
        hoverBackground: 'var(--ath-surface-sunken)',
        borderColor: 'var(--ath-surface-sunken)',
        checkedBorderColor: 'var(--ath-surface-sunken)',
        color: 'var(--ath-text-muted)',
        hoverColor: 'var(--ath-text)',
        checkedColor: 'var(--ath-text)',
      },
      icon: {
        color: 'var(--ath-text-muted)',
        hoverColor: 'var(--ath-text)',
        checkedColor: 'var(--ath-text)',
      },
      content: {
        padding: '0.25rem 0.875rem',
        borderRadius: '{border.radius.sm}',
        checkedBackground: 'var(--ath-surface)',
        checkedShadow: 'none',
      },
    },
    // Titres de boîte et de panneau : Manrope 700, 22 px (titre de section).
    dialog: {
      title: { fontSize: 'var(--ath-text-section)', fontWeight: 'var(--ath-weight-bold)' },
    },
    drawer: {
      root: { background: 'var(--ath-surface)', borderColor: 'var(--ath-line)' },
      header: { padding: '1.5rem' },
      title: { fontSize: 'var(--ath-text-section)', fontWeight: 'var(--ath-weight-bold)' },
      content: { padding: '0 1.5rem 1.5rem 1.5rem' },
    },
  },
});
