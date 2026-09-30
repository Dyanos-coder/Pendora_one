module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    '@electron-toolkit/eslint-config-ts/recommended'
  ],
  settings: {
    react: { version: 'detect' }
  },
  ignorePatterns: ['out', 'dist', 'src/generated', 'node_modules', 'resources'],
  rules: {
    // Désactivée : purement stylistique (annotation explicite d'un type que `tsc` infère déjà
    // correctement, vérifié par `npm run typecheck` en parallèle du lint dans la CI) — des
    // centaines de fonctions existantes dans ce projet ne l'ont jamais eue, l'activer imposerait
    // un chantier de rattrapage mécanique sans gain de sécurité réel (contrairement aux règles
    // ci-dessus, qui attrapent de vrais bugs).
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
}
