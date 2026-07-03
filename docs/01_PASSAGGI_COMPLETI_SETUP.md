# Passaggi completi - setup senza server locale

## 1. Cosa stiamo costruendo

App pubblica online per tutti i clan COD Mobile.

Non userai un server locale. Userai:

- Supabase: database, login, storage screenshot
- Vercel: pubblicazione della web app
- GitHub: repository codice

## 2. Crea account Supabase

1. Vai su Supabase.
2. Crea nuovo progetto.
3. Scegli nome progetto, password database e regione.
4. Aspetta completamento provisioning.
5. Apri Project Settings > API.
6. Copia:
   - Project URL
   - anon public key

Questi due valori vanno messi nel progetto Next.js.

## 3. Crea database

1. In Supabase apri SQL Editor.
2. Apri file `supabase/schema.sql` di questo pacchetto.
3. Copia tutto.
4. Incolla in SQL Editor.
5. Premi Run.

Risultato atteso:

- tabelle create
- funzioni sicurezza create
- RLS attiva
- policy create
- bucket storage `codm-screenshots` creato

## 4. Configura app in locale

Apri terminale nella cartella progetto:

```bash
npm install
cp .env.example .env.local
```

Nel file `.env.local` metti:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
NEXT_PUBLIC_APP_NAME=CODM Clan Intelligence
```

Avvia:

```bash
npm run dev
```

Apri:

```text
http://localhost:3000
```

## 5. Primo test funzionale

### Test A - Login

1. Vai su `/login`.
2. Inserisci email/password.
3. Clicca `Crea account`.
4. Se Supabase richiede conferma email, conferma.
5. Poi fai login.

### Test B - Crea clan

1. Vai su `/onboarding`.
2. Inserisci nome clan, esempio `AK Clan`.
3. Inserisci tag, esempio `AK`.
4. Clicca `Crea clan`.

Risultato atteso:

- tabella `clans` contiene il clan
- tabella `clan_members` contiene il tuo utente come `owner`

### Test C - Player manuale

1. Vai su `/players`.
2. Inserisci nickname, UID, rank MP, rank BR.
3. Salva.
4. Verifica tabella roster.

### Test D - Partita manuale

1. Vai su `/matches`.
2. Scegli tipo partita `scrim`.
3. Scegli modalità `CED`.
4. Inserisci mappa, score, risultato.
5. Salva.
6. Vai su Dashboard.

Risultato atteso:

- Dashboard mostra partita salvata.

### Test E - Import profilo screenshot

1. Vai su `/import/profile`.
2. Carica screenshot profilo CODM.
3. Clicca `Leggi screenshot`.
4. Controlla nickname/UID/rank.
5. Correggi campi se necessario.
6. Clicca `Conferma e crea player`.

### Test F - Import scoreboard screenshot

1. Vai su `/import/match`.
2. Carica screenshot scoreboard fine partita.
3. Clicca `Leggi scoreboard`.
4. Correggi righe player.
5. Imposta modalità CED/TDM/Prima Linea/Dominio ecc.
6. Salva.

Risultato atteso:

- match creato
- player creati se non esistono
- statistiche partita salvate

## 6. Pubblica su GitHub

```bash
git init
git add .
git commit -m "CODM Clan Intelligence Cloud MVP 0.1"
git branch -M main
git remote add origin https://github.com/TUO_UTENTE/codm-clan-intelligence.git
git push -u origin main
```

## 7. Deploy su Vercel

1. Entra su Vercel.
2. New Project.
3. Importa repository GitHub.
4. Framework: Next.js.
5. Aggiungi environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_NAME`
6. Deploy.

## 8. Dopo deploy

Apri URL Vercel.

Fai lo stesso test:

1. Login.
2. Onboarding clan.
3. Player.
4. Match.
5. Import screenshot.

## 9. Cose da non fare

- Non mettere la Supabase service role key nel frontend.
- Non disattivare RLS in produzione.
- Non salvare dati di chat private senza consenso.
- Non affidarti solo all'OCR senza conferma manuale.

## 10. Prossimo sviluppo consigliato

Versione 0.2:

- selezione clan corrente
- inviti player/staff
- dashboard con aggregazioni reali
- profilo dettagliato player
- statistiche per modalità e mappa
- upload screenshot con anteprima migliore

Versione 0.3:

- OCR con ritaglio zona automatico
- salvataggio player_snapshots
- report partita completo
- export Excel/PDF

Versione 0.4:

- loadout builder
- performance per loadout
- MVP settimanale
- ranking interno clan
