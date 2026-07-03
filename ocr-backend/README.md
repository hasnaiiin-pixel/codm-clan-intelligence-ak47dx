# OCR Backend Hybrid 2.0 AK47DX

Avvio:

```bat
setup_ocr_backend.bat
start_ocr_backend.bat
```

Health:

```text
http://127.0.0.1:8780/health
```

## Motori OCR

### Tesseract locale
Installa Tesseract OCR per Windows e, se non è nel PATH, imposta in `.env` o variabili ambiente:

```text
TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe
```

### Google Vision
Puoi usare una API key:

```text
GOOGLE_VISION_API_KEY=xxxxx
```

oppure service account:

```text
GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\service-account.json
```

### PaddleOCR opzionale

```bat
install_paddleocr_optional.bat
```
