CODM AK47DX - PATCH AUTH / RUOLI / MOBILE SIDEBAR

NON sostituisce il database da zero.
Aggiunge sicurezza vera su Supabase e frontend role guard.

ORDINE:
1) Estrai lo ZIP dentro la root del progetto codm-clan-intelligence-ak47dx.
2) Supabase SQL Editor: esegui patch_files/supabase/04_auth_roles_public_read_private_write.sql.
3) Avvia APPLICA_CODM_AUTH_ROLE_MOBILE_FIX.bat dalla root progetto.
4) Se build OK:
   git add -A
   git commit -m "feat: auth roles player registration mobile sidebar"
   git push origin main
5) Vercel: redeploy senza cache.

TEST:
- Incognito senza login: dashboard visibile, pagine operative bloccate.
- Login admin: import/modifica funzionano.
- Player nuovo: /login registrazione, poi /profile-import, poi admin approva da /admin/users.
