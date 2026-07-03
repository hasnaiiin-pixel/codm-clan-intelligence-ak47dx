# FIX2 - Installazione backend OCR con Python compatibile

## Problema corretto

L'errore:

```text
Pillow 11.0.0 does not support Python 3.14
Failed building wheel for pillow
```

succede perché il PC sta usando Python 3.14. Molte librerie OCR/immagini su Windows, come Pillow/OpenCV, non hanno ancora wheel stabile per Python 3.14.

## Soluzione

Usare Python 3.11 o 3.12 a 64 bit.

Il nuovo `setup_ocr_backend.bat` cerca automaticamente:

1. Python 3.12
2. Python 3.11
3. Python 3.10

Se trova solo Python 3.14, si ferma con messaggio chiaro.

## Passi

1. Installa Python 3.12 da python.org.
2. Durante installazione spunta `Add python.exe to PATH`.
3. Chiudi e riapri la cartella progetto.
4. Esegui `setup_ocr_backend.bat`.
5. Esegui `start_all.bat`.

## Test

Apri:

```text
http://127.0.0.1:8765/health
```

Se il backend è attivo, deve rispondere con `ok: true`.
