# OCR Hybrid Engine 0.9

## Obiettivo

Sostituire il flusso a tentativi con una pipeline stabile:

1. Normalizzazione screenshot.
2. Rilevamento layout con OpenCV.
3. Ritaglio celle.
4. OCR specializzato per tipo cella.
5. Parser CED con validazione.
6. Preview correggibile.

## Motori

- `google_vision`: testo difficile, nickname, profilo.
- `tesseract`: numeri, K/D/A, score, impatto.
- `paddleocr`: fallback locale opzionale.

## Regola anti-falso

Se il backend non ha motori OCR disponibili, non scrive valori finti e aggiunge warning.

## Futuro YOLO

La cartella backend è strutturata per sostituire `detector.py` con detector YOLOv8 quando avremo dataset annotato.
