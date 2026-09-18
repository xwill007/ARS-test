# Problemas y soluciones — Requerimiento 018

## 1. No se pudo verificar en navegador con `claude-in-chrome`: certificado HTTPS no confiado

**Fecha:** 2026-09-18, durante la Fase 7 (verificación final) de la implementación.

**Problema:** al intentar abrir `artest-mirror.html` con las herramientas de automatización de
navegador (`claude-in-chrome`) para confirmar que los overlays reubicados cargan sin 404, la
página mostró un interstitial de error de certificado en vez de la app — las herramientas de
lectura de página/accesibilidad no pueden leer ni interactuar con esa pantalla (es la UI nativa
del navegador, no el DOM de la aplicación).

**Causa:** el servidor de desarrollo de Vite (`vite.config.js` → `server.https`) usa un
certificado autofirmado (`ssl/key.pem`/`ssl/cert.pem`) que no está en la lista de confianza del
perfil de Chrome usado por `claude-in-chrome` — un problema de ese perfil de navegador
específico, no de la aplicación ni de este requerimiento (ya documentado en varios comentarios del
código, ej. `vrSongsApi.util.js`: "HTTPS autofirmado no confiado en el dispositivo").

**Solución:** no se intentó forzar el bypass del aviso de seguridad del navegador. Se completó en
cambio toda la verificación posible sin navegador real: `npm run build` en verde (con las 4
entradas de `vite.config.js` generando sus `.html` en las rutas nuevas esperadas),
`npm run check:i18n` en verde, y confirmación con `git status` de que cada archivo movido quedó
como renombrado (`R`/`RM`), nunca borrado+creado, con un diff de contenido acotado a las líneas de
import/`iframe src` recalculadas.

**Estado:** pendiente la verificación manual en navegador (por el usuario, u otra sesión con el
certificado ya confiado) — ver checklist.md Fase 7 y `requerimiento.md` sección 7 para el detalle
exacto de qué falta confirmar (overlays sin 404, AR-TEST funcionando, activar/desactivar overlays
desde el menú ⚙️).
