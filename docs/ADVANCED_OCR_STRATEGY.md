# Strategia OCR avanzata CODM 0.7

## Perché è cambiato approccio
La lettura solo con coordinate fisse non è stabile: risoluzione, ritaglio, compressione WhatsApp, lingua e aspect ratio spostano i campi. La 0.7 introduce un template calibrabile.

## Flusso professionale
1. Vai su `Calibrazione OCR`.
2. Carica screenshot reale CED.
3. Sposta i riquadri su:
   - SCORE BLUE
   - SCORE RED
   - MODE/MAP
   - K/D/A per ogni riga
   - SCORE per ogni riga
   - IMPACT per ogni riga
4. Salva template.
5. Vai su `Import Partita` e usa OCR calibrato.

## Strategia futura con PaddleOCR
Quando il template calibrato sarà stabile, si può aggiungere backend cloud con PaddleOCR:
- upload screenshot a backend
- text detection con PaddleOCR
- matching box testo con righe/colonne calibrate
- ritorno JSON pulito all'app

Per ora 0.7 resta senza server aggiuntivo: funziona nel browser e salva template in localStorage.
