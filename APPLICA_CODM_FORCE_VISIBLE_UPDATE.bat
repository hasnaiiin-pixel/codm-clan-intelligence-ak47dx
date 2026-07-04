@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo CODM - FORCE VISIBLE UPDATE / VERSION CHECK
echo ======================================================
echo.
echo Questo script deve essere avviato dalla ROOT del progetto CODM.
echo Crea /version e /cache-reset per verificare che Vercel mostri la versione nuova.
echo.
node scripts\apply-codm-force-visible-update.cjs
if errorlevel 1 goto err

echo.
echo Ora provo la build locale...
call npm run build
if errorlevel 1 goto err

echo.
echo OK. Ora fai:
echo git add -A
echo git commit -m "chore: add visible deploy version check"
echo git push origin main
echo.
echo Dopo il deploy Vercel apri /version e /cache-reset.
goto end

:err
echo.
echo ERRORE: controlla il log sopra.
exit /b 1

:end
endlocal
