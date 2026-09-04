@echo off
REM filepath: B:\GITHUB\WilberVargas\start.bat
REM Agregar Node.js al PATH
set PATH=%PATH%;B:\PROGRAMAS\Node
cd /d "%~dp0..\ApprendeVr\frontend"
npm run dev
pause