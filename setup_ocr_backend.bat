@echo off
setlocal
cd /d "%~dp0ocr-backend"
echo ============================================
echo CODM OCR Hybrid Engine 0.9 - Setup Python
 echo ============================================
set PYEXE=
for %%P in (py) do (
  %%P -3.12 --version >nul 2>nul && set PYEXE=%%P -3.12
)
if "%PYEXE%"=="" (
  for %%P in (py) do (
    %%P -3.11 --version >nul 2>nul && set PYEXE=%%P -3.11
  )
)
if "%PYEXE%"=="" (
  for %%P in (py) do (
    %%P -3.10 --version >nul 2>nul && set PYEXE=%%P -3.10
  )
)
if "%PYEXE%"=="" (
  echo ERRORE: installa Python 3.12 64 bit e seleziona Add Python to PATH.
  pause
  exit /b 1
)
echo Uso Python: %PYEXE%
if not exist .venv (
  %PYEXE% -m venv .venv
)
.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERRORE: installazione dipendenze backend fallita.
  pause
  exit /b 1
)
echo.
echo Setup completato.
echo Per OCR numerico locale installa Tesseract oppure configura Google Vision.
echo Verifica backend dopo avvio: http://127.0.0.1:8780/health
pause
