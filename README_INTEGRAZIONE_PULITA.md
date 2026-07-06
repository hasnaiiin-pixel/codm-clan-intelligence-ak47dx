# CODM PWA FULL STABLE CLEAN BUILD V4

Questa versione sostituisce HOTFIX3 con una soluzione pulita, senza forzature DOM.

## Cosa cambia

- Menu mobile PWA vero tramite componente React `MobileBottomNav`.
- Tasto `Statistiche` nel menu basso.
- Hamburger/tre linee sopra nascosti solo se il tuo header desktop riceve la classe `codm-desktop-header-menu` oppure `codm-desktop-only`.
- Salvataggio evento tramite repository unico `saveCodmEvent`.
- Nessun `id: local-ak47dx` viene inviato a Supabase.
- `local-ak47dx` resta solo in `local_id` o `local_uuid_refs`.
- Service worker, manifest, icone, offline page e badge PWA.

## 1. Copia file

Copia nel progetto le cartelle:

```text
public/
src/
supabase/
tools/
```

## 2. Importa CSS e Service Worker

Nel tuo `src/main.jsx` o `src/main.tsx`:

```js
import './styles/codm-pwa-clean.css';
import { registerCodmServiceWorker } from './pwa/registerCodmServiceWorker';

registerCodmServiceWorker();
```

## 3. Collega menu mobile nel layout principale

Nel layout principale importa:

```js
import MobileBottomNav from './components/mobile/MobileBottomNav';
import { useCodmMobile } from './hooks/useCodmMobile';
```

Poi usa:

```jsx
const { isPwaMobile } = useCodmMobile();

{isPwaMobile && (
  <MobileBottomNav
    activeKey={activePage}
    unreadCount={unreadCount}
    onNavigate={(key) => setActivePage(key)}
  />
)}
```

Mappa le pagine così:

```text
home        -> Home / Dashboard
events      -> Eventi
calendar    -> Calendario
statistics  -> Statistiche
more        -> Altro / Admin / Impostazioni
```

## 4. Nascondi menu tre linee solo su PWA/mobile

Non usare script che lo nascondono a forza. Nel tuo header desktop aggiungi una classe:

```jsx
<header className={isPwaMobile ? 'codm-desktop-header-menu' : ''}>
```

Oppure sul solo pulsante hamburger:

```jsx
<button className="codm-desktop-hamburger">☰</button>
```

Così su desktop resta visibile, su PWA/mobile sparisce.

## 5. Sistema Crea Evento

Nel componente dove hai il bottone `Crea evento`, usa stato React:

```js
const [createEventOpen, setCreateEventOpen] = useState(false);
```

Bottone:

```jsx
<button type="button" onClick={() => setCreateEventOpen(true)}>
  Crea evento
</button>
```

Modal:

```jsx
<CreateEventModal
  open={createEventOpen}
  onClose={() => setCreateEventOpen(false)}
  supabase={supabase}
  tableName="events"
/>
```

## 6. Fix definitivo Supabase UUID

Non fare più:

```js
await supabase.from('events').insert(evento);
```

Usa sempre:

```js
import { saveCodmEvent } from './services/codmEventRepository';

const result = await saveCodmEvent({
  supabase,
  event: formEvent,
  tableName: 'events'
});
```

Questo crea un payload sicuro:

```text
id                -> solo UUID vero oppure omesso
local_id          -> local-ak47dx / local-...
local_uuid_refs   -> riferimenti locali che non devono andare in colonne uuid
payload           -> dati completi evento
```

## 7. Esegui SQL Supabase

Esegui nel SQL Editor:

```text
supabase/migrations/20260706_codm_events_clean_v4.sql
```

## 8. Verifica automatica base

Dalla root del progetto:

```bash
node tools/verify-codm-pwa.mjs
```

## 9. Build

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM PWA full stable clean mobile statistics events uuid fix"
git push origin main
```

## Test da fare su telefono

- Apri PWA installata.
- Sopra non devi vedere hamburger/tre linee.
- Sotto devi vedere: Home, Eventi, Calendario, Statistiche, Altro.
- Tap su Eventi.
- Tap su Crea evento.
- Deve aprire una schermata/modal full screen.
- Salva evento.
- In Supabase non deve più uscire `invalid input syntax for type uuid: local-ak47dx`.
