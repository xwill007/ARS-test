@echo off
REM Script para instalar html2canvas para optimización estereoscópica

echo 🪞 Instalando html2canvas para captura de pantalla...

REM Instalar html2canvas
call npm install html2canvas

REM Verificar instalación
call npm list html2canvas >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ html2canvas instalado correctamente
    echo 📝 Configuración recomendada en tu componente:
    echo.
    echo import html2canvas from 'html2canvas';
    echo.
    echo // En tu useEffect o función de captura:
    echo html2canvas^(elementToCapture, {
    echo   backgroundColor: null,
    echo   allowTaint: true,
    echo   useCORS: true,
    echo   scale: 0.5,
    echo   logging: false
    echo }^).then^(canvas =^> {
    echo   // Usar canvas capturado
    echo }^);
    echo.
) else (
    echo ❌ Error instalando html2canvas
    echo 💡 Puedes instalarlo manualmente con: npm install html2canvas
)

echo.
echo 🎯 Para activar la optimización estereoscópica:
echo - optimizeStereo: true
echo - mirrorRightPanel: true
echo - muteRightPanel: true

pause
