@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo  CODM AK47DX - STOP PATCH LOOP / STABLE BUILD FIX
echo ======================================================

echo [1/7] Verifico root progetto...
if not exist package.json (
  echo ERRORE: package.json non trovato. Metti questo file nella root del progetto CODM.
  pause
  exit /b 1
)
if not exist app (
  echo ERRORE: cartella app non trovata. Sei nella root corretta?
  pause
  exit /b 1
)

echo [2/7] Creo cartelle corrette...
if not exist src mkdir src
if not exist src\components mkdir src\components

echo [3/7] Copio WriteAccessBlock corretto con prop loading...
copy /Y "src\components\WriteAccessBlock.tsx" "src\components\WriteAccessBlock.tsx" >nul

REM Se lo ZIP viene estratto in una cartella separata e poi copiato, questo copy sopra basta.
REM Se lo script viene avviato dalla root con i file gia copiati, non serve altro.

echo [4/7] Pulisco duplicati componenti root che mandano in errore TypeScript...
if exist components\WriteAccessBlock.tsx (
  ren components\WriteAccessBlock.tsx WriteAccessBlock.tsx.bak_%RANDOM%
  echo Archiviato components\WriteAccessBlock.tsx
)
if exist components\MobileSidebar.tsx (
  ren components\MobileSidebar.tsx MobileSidebar.tsx.bak_%RANDOM%
  echo Archiviato components\MobileSidebar.tsx
)
if exist components\PwaInstaller.tsx (
  ren components\PwaInstaller.tsx PwaInstaller.tsx.bak_%RANDOM%
  echo Archiviato components\PwaInstaller.tsx
)

echo [5/7] Forzo next.config CommonJS stabile...
if exist next.config.js (
  ren next.config.js next.config.js.bak_%RANDOM%
  echo Archiviato next.config.js vecchio
)
copy /Y "next.config.cjs" "next.config.cjs" >nul

echo [6/7] Verifica file critici...
if not exist src\components\WriteAccessBlock.tsx (
  echo ERRORE: src\components\WriteAccessBlock.tsx mancante.
  pause
  exit /b 1
)
if not exist next.config.cjs (
  echo ERRORE: next.config.cjs mancante.
  pause
  exit /b 1
)

echo [7/7] Build locale...
npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build ancora fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo.
echo ======================================================
echo  BUILD OK
 echo Ora fai:
echo  git add -A
echo  git commit -m "fix: stabilize CODM build and stop patch loop"
echo  git push origin main
echo ======================================================
pause
