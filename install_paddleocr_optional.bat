@echo off
setlocal
cd /d "%~dp0ocr-backend"
if not exist .venv\Scripts\python.exe (
  echo Ambiente Python non trovato. Esegui prima setup_ocr_backend.bat
  pause
  exit /b 1
)
echo Installazione PaddleOCR opzionale. Potrebbe richiedere diversi minuti.
.venv\Scripts\python.exe -m pip install -r requirements-paddle-optional.txt
pause
