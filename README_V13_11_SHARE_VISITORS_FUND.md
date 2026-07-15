# CLAN MANAGER AK47DX V13.11

## Modifiche principali

### Statistiche condivisibili
- Esportazione Excel dei dati filtrati.
- Esportazione Excel completa.
- Condivisione riepilogo su WhatsApp.
- Condivisione/scaricamento immagine del riepilogo.
- I file non includono email o UID privati.

### Eventi WhatsApp
- Ogni evento può essere condiviso su WhatsApp con data, ora, avversario, mappe, modalità e link alla pagina Eventi.
- La condivisione apre WhatsApp e l'utente sceglie il gruppo; non usa automazioni non ufficiali.

### Analytics visitatori admin
Pagina: `/admin/visitors`
- Visualizzazioni.
- Visitatori unici.
- Utenti registrati.
- Accessi PWA e mobile.
- Andamento giornaliero.
- Pagine più viste e dispositivi.
- Nessun indirizzo IP viene memorizzato.

### Fondo estrazioni
Pagina: `/fund`
- Quota mensile configurabile.
- Partecipanti collegati ai player CODM.
- Preferenza arma e rarità Leggendaria/Mitica.
- Quote Pagato / Non pagato / Esente.
- Estrazione casuale tra i soli partecipanti idonei.
- Chi è già stato estratto non può essere scelto di nuovo fino al completamento del giro.
- Storico, numero degli idonei e prova casuale salvata.
- L'app non elabora o custodisce pagamenti reali.

## SQL obbligatorio
Eseguire una sola volta:

`supabase/UPDATE_V13_11_SHARE_VISITORS_FUND.sql`

## Installazione e deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.11 condivisione analytics visitatori fondo estrazioni"
git push origin main
```

Dopo il deploy aprire `/cache-reset` oppure chiudere e riaprire la PWA.
