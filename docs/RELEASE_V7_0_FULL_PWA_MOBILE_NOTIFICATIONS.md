# CODM AK47DX V7.0 - Full PWA Mobile + Notifications

## Obiettivo
Rendere l'app una PWA completa e più stabile su telefono, correggendo il problema del pulsante **Crea evento** e aggiungendo badge notifiche in stile social network.

## Correzioni principali
- Registrazione reale del service worker da componente client.
- Manifest PWA completo con `id`, `start_url`, `scope`, `display`, icone MIRZA, shortcut Eventi/Import/Notifiche.
- Pagina `offline.html` per quando il telefono non ha connessione.
- Prompt installazione Android e istruzioni iPhone per “Aggiungi a schermata Home”.
- Bottom navigation mobile: Home, Eventi, Partite, Notifiche/Login, Altro.
- Badge notifiche su menu, bottom navigation e icona PWA quando il browser supporta Badging API.
- Centro notifiche locale PWA con segnatura lette e pulizia badge.
- Fix **Crea evento** su telefono:
  - pulsante `type="button"`;
  - stato `Salvataggio...`;
  - validazione titolo/data;
  - messaggi errore chiari;
  - fallback locale PWA se Supabase non risponde o non è configurato;
  - notifica locale dopo creazione/modifica evento.

## Nota importante notifiche
Il badge locale è già attivo nella PWA. Le push server vere, ricevute anche con app chiusa, richiedono dominio HTTPS e configurazione Web Push/VAPID o servizio push dedicato.

## Verifica veloce
1. Eseguire `npm ci --legacy-peer-deps`.
2. Eseguire `npm run build`.
3. Pubblicare su HTTPS.
4. Da telefono aprire `/version` e verificare marker `V7_0_FULL_PWA_MOBILE_NOTIFICATIONS_OK`.
5. Da telefono aprire `/events`, premere `Crea evento`, compilare titolo/data e premere `Crea evento completo`.
6. Aprire `/notifications` e verificare badge/notifica locale.
7. Su Android usare `Installa app`; su iPhone Safari → Condividi → Aggiungi a schermata Home.

## Marker
`V7_0_FULL_PWA_MOBILE_NOTIFICATIONS_OK`
