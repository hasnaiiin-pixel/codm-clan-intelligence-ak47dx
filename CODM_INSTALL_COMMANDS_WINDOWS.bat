@echo off
setlocal

echo ==========================================
echo CODM Clan Intelligence - Vercel deploy fix
echo ==========================================

echo.
echo 1) Aggiorno package.json senza cancellare dipendenze...
node scripts\apply-codm-vercel-fix.mjs
if errorlevel 1 goto error

echo.
echo 2) Pulisco node_modules...
if exist node_modules rmdir /s /q node_modules

echo.
echo 3) Rimuovo package-lock vecchio se presente...
if exist package-lock.json del package-lock.json

echo.
echo 4) Pulisco cache npm...
npm cache clean --force

echo.
echo 5) Reinstallo dipendenze in modalita compatibile Vercel...
npm install --legacy-peer-deps
if errorlevel 1 goto error

echo.
echo 6) Eseguo build locale...
npm run build
if errorlevel 1 goto error

echo.
echo 7) Controllo configurazione finale...
node scripts\check-codm-vercel-ready.mjs
if errorlevel 1 goto error

echo.
echo OK: progetto pronto. Ora fai git add, commit e push.
goto end

:error
echo.
echo ERRORE: procedura interrotta. Leggi il messaggio sopra.
exit /b 1

:end
endlocal
