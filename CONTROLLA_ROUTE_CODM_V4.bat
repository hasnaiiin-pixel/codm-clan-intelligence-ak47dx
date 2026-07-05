@echo off
chcp 65001 >nul
echo ======================================================
echo CODM AK47DX V4 - CONTROLLO FILE ROUTE
 echo ======================================================
if exist app\events\page.tsx (echo OK /events) else (echo MISSING app\events\page.tsx)
if exist app\ocr-status\page.tsx (echo OK /ocr-status) else (echo MISSING app\ocr-status\page.tsx)
if exist app\api\telegram\reminders\route.ts (echo OK /api/telegram/reminders) else (echo MISSING app\api\telegram\reminders\route.ts)
if exist app\admin\users\page.tsx (echo OK /admin/users) else (echo MISSING app\admin\users\page.tsx)
if exist src\components\MobileSidebar.tsx (echo OK MobileSidebar) else (echo MISSING MobileSidebar)
if exist src\components\WriteAccessBlock.tsx (echo OK WriteAccessBlock) else (echo MISSING WriteAccessBlock)
if exist src\components\PwaInstaller.tsx (echo OK PwaInstaller) else (echo MISSING PwaInstaller)
echo.
git log -1 --oneline 2>nul
pause
