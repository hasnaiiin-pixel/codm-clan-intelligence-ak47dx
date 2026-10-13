# CLAN MANAGER AK47DX V13.11.2

Patch mirata sopra V13.11.1.

## Correzioni
- Ordinamento tabelle funzionante anche su PWA/mobile e su tabelle caricate dopo la pagina.
- Indicatore ordinamento touch visibile: ↕, ↑, ↓.
- Primo tocco crescente, secondo tocco decrescente.
- Selezione dei grafici annullabile toccando nuovamente grafico/legenda o il pulsante `✕ Togli`.
- Messaggi WhatsApp statistiche ed eventi riorganizzati con simboli e sezioni.
- Rimossi tutti i link dell’app dai messaggi WhatsApp e dalla Web Share API.
- K/D/A invariato: Kill / Death / Assist.

## SQL
Non serve nuovo SQL.

## Deploy
```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.11.2 ordinamento mobile grafici WhatsApp"
git push origin main
```
