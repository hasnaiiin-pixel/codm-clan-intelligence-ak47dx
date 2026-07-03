@echo off
cd /d "%~dp0ocr-backend"
if not exist .venv\Scripts\python.exe (
  echo Ambiente Python non trovato. Esegui setup_ocr_backend.bat
  pause
  exit /b 1
)
.venv\Scripts\python.exe -c "from app.services.ocr_engines import engine_status; import json; print(json.dumps(engine_status(), indent=2))"
pause
