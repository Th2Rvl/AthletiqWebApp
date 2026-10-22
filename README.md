# AthletiqWebApp

Application web des coachs d'Athletiq : gestion des athlètes et des groupes, bibliothèque d'exercices, composition et planification des séances, suivi des performances et KPI.

**Stack** : Angular 22 (composants standalone, signals, OnPush) · PrimeNG 22 (preset Aura personnalisé) · PrimeIcons.

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
│   ├── core/              (services transverses : api, auth)
│   ├── shared/ui/
│   │   ├── atoms/         (uniquement si aucun composant PrimeNG ne convient)
│   │   ├── molecules/
│   │   └── organisms/
│   └── features/<domaine>/pages/
│       organisations · auth · profile · athletes · groups
│       exercises · workouts · planning · tracking
├── environments/          (apiUrl par environnement)
└── theme/athletiq-preset.ts   (design tokens communs, à répercuter dans l'app mobile)
```

Conventions : skill grepo `front-angular-atomic-design`.
