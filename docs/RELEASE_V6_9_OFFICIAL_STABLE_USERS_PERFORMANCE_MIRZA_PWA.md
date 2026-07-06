# CODM AK47DX V6.9 - Official Stable Users + Performance + MIRZA PWA

## Obiettivo
Preparazione rilascio ufficiale stabile di Clan Manager.

## Modifiche principali

- Icona principale PWA su telefono impostata su MIRZA.
- Manifest aggiornato: short_name `MIRZA`, icone 192/512 dedicate.
- Service Worker aggiornato con cache `clan-manager-mirza-v6-9-stable`.
- Gestione utenti rifatta con API server sicura:
  - legge Supabase Auth con `SUPABASE_SERVICE_ROLE_KEY`;
  - mostra utenti registrati reali;
  - mostra profilo, ruolo, roster, stato e diagnostica;
  - consente cambio ruolo da Owner.
- Sync automatico utenti registrati:
  - Auth -> profiles;
  - Auth -> clan_members;
  - Auth -> players/roster;
  - `hasnaiiin@gmail.com` resta sempre Owner.
- Nuovo endpoint `/api/auth/sync-roster` chiamato dopo login/registrazione/conferma email.
- Nuovo endpoint `/api/admin/users` per lista utenti, ruoli e sync.
- Eventi: salvataggio bozza con debounce 850 ms, meno scritture localStorage, meno rallentamenti quando si cambia tab Chrome.
- Nuovo SQL Supabase: `supabase/08_V6_9_OFFICIAL_STABLE_USERS_ROSTER_PERFORMANCE.sql`.

## Variabili obbligatorie Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Senza `SUPABASE_SERVICE_ROLE_KEY`, Gestione utenti non può vedere la lista reale di Supabase Auth.

## Dopo deploy

1. Eseguire lo SQL V6.9 in Supabase SQL Editor.
2. Fare login con `hasnaiiin@gmail.com`.
3. Aprire `/admin/users`.
4. Premere `Sincronizza Auth → Roster`.
5. Verificare che gli utenti registrati appaiano con ruolo e roster.

## Marker

`V6_9_OFFICIAL_STABLE_USERS_PERFORMANCE_MIRZA_PWA_OK`
