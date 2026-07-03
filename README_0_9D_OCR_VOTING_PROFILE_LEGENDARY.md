# CODM Clan Intelligence 0.9D — OCR Voting + Profilo Leggendario

## Obiettivo
Questa versione stabilizza la calibrazione e aggiunge lettura profilo per i numeri Leggendario MG/BR/DMZ/Zombie.

## Novità principali

### 1. Calibrazione su content frame
I box non sono più interpretati sul file intero quando ci sono bordi neri/crop diversi.
La pagina `/calibration` rileva il content frame dell'immagine e mostra un bordo tratteggiato: i riquadri salvati sono riferiti a quel frame.
Il backend applica la stessa logica quando riceve il template.

### 2. OCR numerico con voto multi-modalità
Per score, K/D/A e impatto il backend non prende più il primo risultato Tesseract.
Per ogni cella crea più letture con preprocessing diversi e sceglie il valore più confermato.
Nel JSON vengono mostrati i candidati usati.

### 3. Import profilo con calibrazione attiva
`/import/profile` ora usa anche il backend Python 0.9D:
- nickname
- UID
- livello
- like/MVP base
- testo rank
- Leggendario MG
- Leggendario BR
- Leggendario DMZ
- Leggendario Zombie

I numeri Leggendario sono salvati dentro `snapshot_data`, così non serve modificare subito lo schema Supabase.

### 4. Template per login + telefono
Resta la logica:
- tipo schermata
- tipologia telefono
- login Supabase / fallback anonymous

## Avvio

```bat
setup_ocr_backend.bat
npm.cmd install
start_all.bat
```

Controllo backend:

```text
http://127.0.0.1:8780/health
```

Versione attesa:

```json
"version": "0.9.3-voting-profile-legendary"
```

## Uso consigliato

### Scoreboard CED
1. Vai in `/calibration`
2. Tipo template: `Scoreboard / punteggio CED`
3. Seleziona il telefono/template
4. Carica uno screenshot campione
5. Regola i box sul content frame
6. Salva
7. Vai in `/import/match`
8. Lascia `Usa calibrazione = Sì`
9. Esegui `OCR Hybrid Pro 0.9D`

### Profilo / numeri Leggendario
1. Vai in `/calibration`
2. Tipo template: `Profilo base`
3. Regola i box:
   - `PROFILE_LEGENDARY_MG_COUNT`
   - `PROFILE_LEGENDARY_BR_COUNT`
   - `PROFILE_LEGENDARY_DMZ_COUNT`
   - `PROFILE_LEGENDARY_ZOMBIE_COUNT`
4. Il box deve coprire solo il numero accanto al simbolo, non tutta l'icona.
5. Salva.
6. Vai in `/import/profile`
7. Usa `OCR Profile Hybrid 0.9D`

## Note
Se lo screenshot cambia molto, crea una nuova tipologia telefono/template invece di correggere sempre lo stesso.
