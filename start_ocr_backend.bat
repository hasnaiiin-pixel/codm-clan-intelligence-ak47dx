@echo off
setlocal
cd /d "%~dp0ocr-backend"
title CODM OCR Hybrid Engine 1.0
if not exist .venv\Scripts\python.exe (
  echo Ambiente Python non trovato. Esegui prima setup_ocr_backend.bat
  pause
  exit /b 1
)
echo Avvio CODM OCR Hybrid Engine 1.0 su http://127.0.0.1:8780
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8780
pause
