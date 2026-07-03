# Aggiornamento 0.2 - Screenshot Stats Core

Questa versione parte dalla 0.1 che hai già testato fino alla Dashboard.

## Cosa cambia

- Import profilo base CODM: nickname, UID, livello, rank, avatar/screenshot.
- Import statistiche profilo divise per: Multigiocatore, Battle Royale, Zombi, DMZ.
- Import scoreboard migliorato per: CED, Postazione/Hardpoint, Dominio.
- Nuovi campi match: impatto, tempo obiettivo, catturate, precisione, headshot, K/D ratio.
- Dashboard migliorata con K/D clan, win rate, ranking player, statistiche per modalità.
- Player roster migliorato con schede player e statistiche aggregate.
- Loadout Center base: screenshot loadout, primaria, secondaria, perk, scorestreak, personaggio.

## Aggiornamento database Supabase

Se hai già eseguito `supabase/schema.sql` della versione 0.1, NON devi rifare tutto lo schema.
Esegui solo:

```text
supabase/migration_0_2.sql
```

Passaggi:

1. Apri Supabase.
2. Vai nel progetto `codm-clan-intelligence`.
3. Vai su SQL Editor.
4. New Query.
5. Incolla tutto il contenuto di `supabase/migration_0_2.sql`.
6. Clicca Run.
7. Se termina senza errore, il database è pronto per la 0.2.

## Aggiornamento progetto sul PC

1. Estrai lo ZIP 0.2.
2. Copia il file `.env.local` dalla cartella vecchia 0.1 alla cartella nuova 0.2.
3. Apri la cartella 0.2 con VS Code.
4. Apri il terminale.
5. Esegui:

```powershell
npm.cmd install
npm.cmd run dev
```

6. Apri:

```text
http://localhost:3000
```

## Ordine test consigliato

1. `/dashboard` per verificare che legge i dati vecchi.
2. `/import/profile` con tipo `Profilo base CODM` usando screenshot profilo base.
3. `/import/profile` con tipo `Statistiche Multigiocatore`.
4. `/import/profile` con tipo `Statistiche Battle Royale`.
5. `/import/match` con screenshot CED.
6. `/import/match` con screenshot Postazione.
7. `/import/match` con screenshot Dominio.
8. `/players` per vedere le schede player aggiornate.
9. `/loadouts` per salvare loadout da screenshot.

## Nota OCR

Il sistema OCR è una base. CODM usa font piccoli e nickname con simboli speciali; per questo il flusso corretto è:

```text
Carica screenshot → Leggi OCR → Correggi manualmente → Salva
```

L'app non deve mai salvare dati OCR senza conferma dell'admin.
