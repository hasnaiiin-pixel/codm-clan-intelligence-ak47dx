# Architettura CODM Clan Intelligence

## Schema generale

```text
Utente web/mobile
  ↓
Next.js PWA su Vercel
  ↓
Supabase Auth
  ↓
Supabase PostgreSQL + RLS
  ↓
Supabase Storage per screenshot
```

## Perché questa architettura

- niente server locale
- costi bassi all'inizio
- app accessibile da link
- database SQL adatto a statistiche
- auth e sicurezza già integrate
- deploy semplice da GitHub

## Multi-clan

Ogni tabella importante ha `clan_id`.

Esempio:

```text
clans
players
matches
match_player_stats
loadouts
```

Così ogni clan vede solo i propri dati.

## RLS

RLS significa Row Level Security.

Regola pratica:

- member legge
- owner/coach/staff scrive
- player/viewer solo visualizza

## Screenshot

Path storage consigliato:

```text
<clan_id>/profiles/<file>.png
<clan_id>/matches/<file>.png
<clan_id>/loadouts/<file>.png
```

Il primo folder è `clan_id`, così le policy storage possono capire a quale clan appartiene il file.

## OCR

Nel MVP l'OCR gira nel browser con Tesseract.js.

Vantaggi:

- nessun backend OCR da pagare
- meno dati sensibili inviati a servizi esterni
- semplice da testare

Limiti:

- può essere lento su telefoni vecchi
- serve conferma manuale
- con font piccoli può sbagliare

## Evoluzione futura OCR

In futuro si può fare:

```text
Upload screenshot
  ↓
Edge Function / Queue
  ↓
OpenCV crop zona scoreboard
  ↓
OCR più preciso
  ↓
Parser specializzato CODM
  ↓
Conferma admin
```
