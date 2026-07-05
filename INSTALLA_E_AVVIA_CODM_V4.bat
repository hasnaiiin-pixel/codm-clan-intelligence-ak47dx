@echo off
chcp 65001 >nul
echo ======================================================
echo CODM AK47DX V4 - INSTALLA / BUILD / AVVIA
echo ======================================================
if not exist package.json (
  echo ERRORE: esegui questo BAT dalla root del progetto, dove si trova package.json.
  pause
  exit /b 1
)

echo [1/4] Installazione dipendenze...
call npm ci --legacy-peer-deps
if errorlevel 1 goto error

echo [2/4] Build controllo...
call npm run build
if errorlevel 1 goto error

echo [3/4] Pronto. Per avviare locale usa: npm run dev
echo [4/4] Per GitHub/Vercel:
echo git add -A
echo git commit -m "feat: CODM v4 aligned auth events telegram OCR"
echo git push origin main
echo.
echo OK.
pause
exit /b 0

:error
echo.
echo ERRORE durante install/build. Copia il log da "next build" in poi.
pause
exit /b 1
