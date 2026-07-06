# CODM PWA FULL STABLE PATCH

Patch pronta per trasformare CODM Clan Intelligence in PWA mobile stabile.

## Cosa corregge

- Menu basso mobile con: Home, Eventi, Calendario, Statistiche, Altro.
- Rimozione menu superiore con tre linee in PWA/mobile.
- Fix bug evento mobile: modalità modal/schermata full screen su telefono.
- Fix Supabase UUID: non invia più `local-ak47dx` dentro colonne `uuid`.
- Gestione `local_id`, `sync_status`, `device_id`, `sync_error`.
- Queue locale PWA con retry quando torna online.
- Badge notifiche su icona app quando supportato.
- Manifest PWA completo, service worker e pagina offline.

## File da copiare nel progetto

Copia le cartelle contenute in questa patch dentro la root del progetto:

```text
public/
src/
supabase/
```

Se alcuni file esistono già, integra il contenuto invece di sovrascrivere tutto.

## 1. Import CSS mobile PWA

Nel file principale React/Vite, di solito `src/main.jsx`, `src/main.tsx` oppure `src/App.jsx`, aggiungi:

```js
import './styles/codm-pwa-mobile-final.css';
```

## 2. Registrazione service worker e badge

Nel file principale aggiungi:

```js
import { registerCodmServiceWorker } from './pwa/registerCodmServiceWorker';

registerCodmServiceWorker();
```

## 3. Menu basso mobile

Nel layout principale importa:

```jsx
import MobileBottomNav from './components/mobile/MobileBottomNav';
```

Poi aggiungi prima della chiusura del layout principale:

```jsx
<MobileBottomNav
  activeKey={activePage}
  unreadCount={unreadNotificationsCount}
  onNavigate={(page) => setActivePage(page)}
/>
```

Mapping consigliato pagine:

```text
home        -> Dashboard/Home
events      -> Eventi
calendar    -> Calendario
statistics  -> Statistiche
more        -> Menu Altro/Admin
```

## 4. Rimozione hamburger mobile/PWA

Aggiungi una classe al bottone hamburger desktop, se non esiste già:

```jsx
<button className="desktop-hamburger mobile-pwa-hide">☰</button>
```

Il CSS incluso lo nasconde solo su telefono/PWA, ma lo lascia su desktop.

## 5. Fix Crea Evento su telefono

Nel pulsante Crea Evento assicurati che usi un handler diretto:

```jsx
<button
  type="button"
  className="codm-primary-btn create-event-btn"
  onClick={() => setEventModalOpen(true)}
>
  Crea evento
</button>
```

Nel modal evento usa queste classi:

```jsx
<div className="event-modal-backdrop" onClick={() => setEventModalOpen(false)}>
  <div className="event-modal-panel" onClick={(e) => e.stopPropagation()}>
    {/* form evento */}
  </div>
</div>
```

## 6. Fix salvataggio evento Supabase UUID

Dove attualmente salvi l'evento, sostituisci la chiamata diretta a Supabase con:

```js
import { saveCodmEventPwa, retryPendingCodmEvents } from './services/codmEventsSync';

const result = await saveCodmEventPwa({
  supabase,
  event: formEvent,
  tableName: 'events'
});

if (result.synced) {
  showToast('Evento salvato e sincronizzato.');
} else {
  showToast('Evento salvato sul dispositivo. Sincronizzazione cloud in attesa.');
}
```

Quando l'app torna online:

```js
window.addEventListener('online', () => {
  retryPendingCodmEvents({ supabase, tableName: 'events' });
});
```

## 7. SQL Supabase

Esegui questo file nel SQL editor di Supabase:

```text
supabase/migrations/20260706_events_uuid_sync_fix.sql
```

## 8. Manifest

Verifica in `index.html` che ci sia:

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#080B12" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

## 9. Build e push

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM PWA full stable mobile layout notifications uuid sync fix"
git push origin main
```

## Risultato atteso

- Da telefono il pulsante Crea Evento apre correttamente il form.
- Evento salvato subito in locale.
- Supabase non riceve più ID locali dentro colonne UUID.
- Menu basso mostra anche Statistiche.
- Menu tre linee superiore sparisce in PWA/mobile.
- Badge notifiche aggiornato quando supportato dal dispositivo.
