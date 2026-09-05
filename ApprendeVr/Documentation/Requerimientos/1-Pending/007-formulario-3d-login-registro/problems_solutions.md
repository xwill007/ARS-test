# Problemas y soluciones

Registro de incidentes encontrados durante la implementación de este requerimiento, con fecha,
causa y solución. Se actualiza a medida que surgen (no se completa por adelantado).

## Registro

### 2026-09-05 — `useVRLanguage()` undefined dentro de `<Html>` (drei)

**Causa:** `@react-three/drei` v9.78.1 monta el contenido de `<Html>` en una raíz de React
separada (`ReactDOM.createRoot(el)` + `.render()`), no mediante un portal. Por eso no hereda los
providers de contexto (`VRLanguageProvider`, `VRThemeProvider`, etc.) del árbol principal de
`App.jsx`. Al activar el formulario (botón "Login"), `LoginRegisterForm` crasheaba con
`Cannot destructure property 't' of 'useVRLanguage(...)' as it is undefined`.

**Solución:** envolver el contenido embebido en `<Html>` con su propio `VRLanguageProvider`,
sincronizado con el idioma activo vía `key={currentLang} defaultLang={currentLang}` (ver
`App.jsx`, sección `showAuth`). Esto preserva el diseño del checklist (Fase 5.3: consumir vía
`useVRLanguage()/t()`) sin reestructurar `LoginRegisterForm`. Limitación conocida: si el usuario
cambia el idioma global mientras el formulario está abierto, la raíz aislada se remonta (por el
`key`) y pierde los valores no guardados del formulario; aceptable dado el alcance actual.

Si en el futuro se necesita `VRThemeContext` (u otro contexto) dentro de contenido embebido en
`<Html>`, aplicar el mismo patrón: volver a proveer el contexto localmente en ese punto, no asumir
que se hereda del árbol externo.
