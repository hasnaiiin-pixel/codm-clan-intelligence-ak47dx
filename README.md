# Clan Manager — CODM AK47DX V6.8

Build preparata partendo da `CODM_AK47DX_V6_7_CLAN_HQ_RULES_MAP_BAN_FLOW_BUILD.zip`.

## Controllo eseguito
- `npm ci --legacy-peer-deps` OK.
- `npm run build` OK fino a `Compiled successfully` e `Generating static pages`.
- Nel sandbox Next può restare lungo su `Collecting build traces`, comportamento già visto nelle build precedenti. Su PC/Vercel verificare con Node 24.x.

## Cambi principali V6.8
- Admin principale impostato: `hasnaiiin@gmail.com`.
- Se fai login con `hasnaiiin@gmail.com`, l'app assegna ruolo frontend **Owner/Admin**.
- Aggiunto endpoint `/api/admin/ensure-main-owner` per assegnare automaticamente l'owner nel database con `SUPABASE_SERVICE_ROLE_KEY`.
- Aggiunto SQL Supabase `supabase/07_MAIN_ADMIN_HASNAIIN_OWNER_FIX.sql` per rendere permanente il permesso admin anche lato RLS.
- Clan principale confermato su `AK47DX`.
- Corretto seed owner precedente che aveva email non quotata e tag legacy.

## Passaggio importante Supabase
Dopo aver caricato la build, entra in Supabase SQL Editor ed esegui una volta:

```sql
supabase/07_MAIN_ADMIN_HASNAIIN_OWNER_FIX.sql
```

Se su Vercel è già configurata `SUPABASE_SERVICE_ROLE_KEY`, la app prova anche ad assegnare automaticamente il ruolo owner dopo il login.

## Comandi consigliati
```bash
npm ci --legacy-peer-deps
npm run build
npm run dev
```

## Commit suggerito
```bash
git add -A
git commit -m "fix: CODM v6.8 main admin owner permissions"
git push origin main
```
