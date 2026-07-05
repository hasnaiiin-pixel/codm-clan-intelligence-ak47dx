@echo off
chcp 65001 >nul
echo ======================================================
echo CODM AK47DX V4 - PULIZIA FILE VECCHI NON NECESSARI
echo ======================================================
if not exist package.json (
  echo ERRORE: esegui dalla root progetto.
  pause
  exit /b 1
)
if exist patch_files rmdir /s /q patch_files
if exist patch_files_old rmdir /s /q patch_files_old
if exist patch_source rmdir /s /q patch_source
if exist __codm_v4_source rmdir /s /q __codm_v4_source
if exist _codm_backup_before_auth_role_guard rmdir /s /q _codm_backup_before_auth_role_guard
for /d %%D in (backup_visible_routes_*) do rmdir /s /q "%%D"
if exist components rmdir /s /q components
if exist .next rmdir /s /q .next
if exist tsconfig.tsbuildinfo del /q tsconfig.tsbuildinfo
echo Pulizia completata. Ora esegui npm ci --legacy-peer-deps e npm run build.
pause
