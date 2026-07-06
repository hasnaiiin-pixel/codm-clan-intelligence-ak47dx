# CODM Clan Manager V6.8 — Main Admin Owner Fix

Build preparata partendo da `CODM_AK47DX_V6_7_CLAN_HQ_RULES_MAP_BAN_FLOW_BUILD.zip`.

## Obiettivo
L'account `hasnaiiin@gmail.com` è l'admin principale della piattaforma e deve poter modificare tutto senza dover essere approvato manualmente.

## Modifiche
- Aggiunta costante app `CODM_MAIN_ADMIN_EMAIL = hasnaiiin@gmail.com`.
- Se l'utente loggato ha email `hasnaiiin@gmail.com`, il frontend lo considera sempre ruolo `owner`.
- Aggiunto endpoint server `/api/admin/ensure-main-owner`:
  - verifica la sessione Supabase dell'utente loggato;
  - accetta solo `hasnaiiin@gmail.com`;
  - assegna automaticamente ruolo `owner` in `clan_members` usando `SUPABASE_SERVICE_ROLE_KEY`;
  - imposta il clan AK47DX come clan principale;
  - corregge vecchi tag roster placeholder.
- Login aggiornato: dopo login verifica subito i permessi admin principali prima di aprire la dashboard.
- Aggiunto SQL Supabase `supabase/07_MAIN_ADMIN_HASNAIIN_OWNER_FIX.sql` per fix permanente lato database/RLS.
- Corretto seed SQL owner con email quotata e tag `AK47DX`.

## Nota Supabase importante
Per rendere i permessi effettivi anche lato database/RLS, eseguire una volta in Supabase SQL Editor:

```sql
supabase/07_MAIN_ADMIN_HASNAIIN_OWNER_FIX.sql
```

L'endpoint automatico funziona se su Vercel/ambiente server è configurata anche:

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

## Comandi consigliati
```bash
npm ci --legacy-peer-deps
npm run build
```
