# AthletiqWebApp

Application web des coachs d'Athletiq : gestion des athlètes et des groupes, bibliothèque d'exercices, composition et planification des séances, suivi des performances et KPI.

**Stack** : Angular 22 (composants standalone, signals, OnPush) · PrimeNG 22 (preset Aura personnalisé) · Ionicons (paquet `ionicons`, sans Ionic Framework) · Manrope + Public Sans.

## Démarrer

```bash
npm install
npm start          # http://localhost:4200, API attendue sur http://localhost:8080/api/v1
npm test
npm run build
```

## Arborescence

```
src/
├── app/
│   ├── core/              (services transverses : api, auth, icons)
│   ├── shared/ui/
│   │   ├── atoms/         (uniquement si aucun composant PrimeNG ne convient)
│   │   ├── molecules/
│   │   └── organisms/
│   └── features/<domaine>/pages/
│       organisations · auth · profile · athletes · groups
│       exercises · workouts · planning · tracking
├── environments/          (apiUrl par environnement)
└── theme/
    ├── tokens.scss            (design tokens communs, identique dans l'app mobile)
    └── athletiq-preset.ts     (preset PrimeNG, thème sombre via la classe `ath-dark`)
```

Conventions : skill grepo `front-angular-atomic-design`.
