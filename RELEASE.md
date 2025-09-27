# Guide des Releases GitHub Actions

Ce projet utilise GitHub Actions pour automatiser la création de releases multi-plateformes.

## 📋 Comment créer une release

### Méthode 1: Avec un tag Git (Recommandée)

1. **Créer et pousser un tag de version :**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Le workflow se déclenche automatiquement** et :
   - Compile l'application pour Windows, macOS et Linux
   - Crée une release GitHub avec tous les binaires
   - Génère automatiquement les notes de release

### Méthode 2: Déclenchement manuel

1. Aller sur GitHub → Actions → Release workflow
2. Cliquer sur "Run workflow"
3. Sélectionner la branche et lancer

## 🏗️ Que fait le workflow ?

### Job `build` (En parallèle sur 3 OS)
- **macOS** : Compile avec `npm run build:mac`
- **Linux** : Compile avec `npm run build:linux` 
- **Windows** : Compile avec `npm run build:win`

### Job `release` (Si tag de version)
- Télécharge tous les artifacts
- Crée une release GitHub
- Attache tous les binaires à la release

## 📁 Structure des artifacts

```
releases/
├── Navigateur-1.0.0.dmg           # macOS
├── Navigateur-1.0.0.AppImage      # Linux
├── Navigateur Setup 1.0.0.exe    # Windows
└── ...
```

## 🔧 Configuration requise

Le workflow fonctionne immédiatement sans configuration supplémentaire. Les permissions GitHub sont automatiquement gérées.

## 📝 Nomenclature des versions

Utilisez le format [SemVer](https://semver.org/) :
- `v1.0.0` - Version majeure
- `v1.0.1` - Correction de bugs
- `v1.1.0` - Nouvelles fonctionnalités
- `v2.0.0` - Changements incompatibles

## 🚀 Exemples de commandes

```bash
# Première release
git tag v1.0.0
git push origin v1.0.0

# Correction de bug
git tag v1.0.1 
git push origin v1.0.1

# Nouvelle fonctionnalité
git tag v1.1.0
git push origin v1.1.0
```

## ⚠️ Notes importantes

- Les builds prennent environ 10-15 minutes par plateforme
- Seuls les tags commençant par 'v' déclenchent une release
- Les artifacts sont conservés 30 jours sur GitHub Actions
- La signature de code macOS nécessiterait des certificats (optionnel)