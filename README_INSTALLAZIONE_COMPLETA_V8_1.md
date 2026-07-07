# CLAN MANAGER AK47DX V8.1A - SQL COMPAT FIX

Questa build corregge l'errore Supabase:

`ERROR: 42703: column "updated_at" of relation "clans" does not exist`

## SQL da eseguire

Eseguire in Supabase SQL Editor:

`supabase/15_V8_1A_SQL_COMPAT_FIX.sql`

Questo script aggiunge in modo sicuro le colonne mancanti alle tabelle esistenti `clans` e `clan_members`, poi applica la logica V8.1 eventi/modifica/cancellazione/Telegram.

## Deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.1A fix SQL compat clans updated_at"
git push origin main
```
