@echo off
setlocal
cd /d "%~dp0ocr-backend"

echo === CODM OCR Regression Test FIX5 ===
if not exist ".venv\Scripts\python.exe" (
  echo ERRORE: .venv non trovato. Esegui prima setup_ocr_backend.bat
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m tests.run_regression
if errorlevel 1 (
  echo.
  echo REGRESSION FALLITA: non usare questa build per import automatico.
  pause
  exit /b 1
)
echo.
echo REGRESSION OK: score e righe blu del campione CED sono stabili.
pause
