@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-harmonic-motion.ps1" %*
exit /b %ERRORLEVEL%
