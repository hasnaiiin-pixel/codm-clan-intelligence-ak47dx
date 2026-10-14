# CLAN MANAGER AK47DX V13.3 - Admin player, Telegram gruppo, nome avversario

Base: V13.2 stabile. Patch mirata senza toccare import/OCR/Kill Death Assist.

## Modifiche incluse

1. Admin principale associabile a player reale
- L’account admin principale resta Owner, non cancellabile e con permessi completi.
- Ora però in Admin > Utenti puoi cambiare anche la sua associazione account -> player CODM.
- Se attualmente è collegato a un nome senza statistiche, seleziona il player corretto con statistiche.
- Il sync Auth non deve più sovrascrivere nickname/UID di un player già collegato manualmente.

2. Telegram gruppo
- Invio eventi/test verso tutti i target configurati: privato + gruppo.
- Supporta più variabili: TELEGRAM_GROUP_CHAT_ID, TELEGRAM_CLAN_GROUP_CHAT_ID, TELEGRAM_GROUP_ID, TELEGRAM_CHAT_ID_GROUP.
- Supporta anche più chat id separati da virgola, es. TELEGRAM_CHAT_ID=123456789,-1009876543210.
- /api/telegram/status ora mostra targetCounts private/group.
- /api/telegram/test accetta target=group, target=private o target=all.

3. Eventi - avversario libero
- Il campo non viene più forzato a “Avversario / Organizzatore”.
- Aggiunto campo visibile “Nome avversario / organizzatore”.
- Puoi scrivere il nome che vuoi tu.
- Se lo lasci vuoto, non viene salvato un falso clan avversario.

## SQL
Eseguire una volta:

supabase/UPDATE_V13_3_ADMIN_PLAYER_LINK.sql

## Telegram test
Dopo deploy:

/api/telegram/status
/api/telegram/test?secret=TUO_CRON_SECRET&target=group
/api/telegram/test?secret=TUO_CRON_SECRET&target=all

Se target=group non arriva nel gruppo, controllare:
- TELEGRAM_GROUP_CHAT_ID su Vercel è presente e in Production/Preview corretto.
- Hai fatto Redeploy dopo aver salvato la variabile.
- Il bot è dentro il gruppo.
- Il bot può inviare messaggi.
- Chat ID gruppo deve essere negativo tipo -100xxxxxxxxxx per supergruppi privati.

## Verifica locale

npm ci --legacy-peer-deps
npx tsc --noEmit
npm run build
