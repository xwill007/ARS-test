#!/bin/bash
# Script para instalar html2canvas para optimización estereoscópica

echo "🪞 Instalando html2canvas para captura de pantalla..."

# Instalar html2canvas
npm install html2canvas

# Verificar instalación
if npm list html2canvas > /dev/null 2>&1; then
    echo "✅ html2canvas instalado correctamente"
    echo "📝 Configuración recomendada en tu componente:"
    echo ""
    echo "import html2canvas from 'html2canvas';"
    echo ""
    echo "// En tu useEffect o función de captura:"
    echo "html2canvas(elementToCapture, {"
    echo "  backgroundColor: null,"
    echo "  allowTaint: true,"
    echo "  useCORS: true,"
    echo "  scale: 0.5,"
    echo "  logging: false"
    echo "}).then(canvas => {"
    echo "  // Usar canvas capturado"
    echo "});"
    echo ""
else
    echo "❌ Error instalando html2canvas"
    echo "💡 Puedes instalarlo manualmente con: npm install html2canvas"
fi

echo ""
echo "🎯 Para activar la optimización estereoscópica:"
echo "- optimizeStereo: true"
echo "- mirrorRightPanel: true" 
echo "- muteRightPanel: true"
