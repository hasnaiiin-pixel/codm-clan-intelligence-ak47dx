FIX V5.5 - DeveloperBrand build error

Errore risolto:
Module not found: Can't resolve '@/components/DeveloperBrand'

Copia queste cartelle nella root del progetto:
- src/components/DeveloperBrand.tsx
- public/assets/mirza-developer-logo.svg

Poi esegui:
  git add -A
  git commit -m "fix: add MIRZA developer brand component"
  git push origin main

Controllo locale consigliato:
  dir src\components\DeveloperBrand.tsx
  dir public\assets\mirza-developer-logo.svg
  npm run build
