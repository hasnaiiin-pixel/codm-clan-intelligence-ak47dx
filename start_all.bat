@echo off
cd /d "%~dp0"
start "CODM OCR Hybrid Engine" cmd /k start_ocr_backend.bat
timeout /t 2 >nul
start "CODM Frontend" cmd /k npm.cmd run dev
