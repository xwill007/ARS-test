---
name: texto-multidioma
description: Todo texto visible en la interfaz de ApprendeVr/frontend debe registrarse y traducirse en los locales (es/en/br) y consumirse con useVRLanguage()/t(). Usar SIEMPRE que se agregue o modifique un botón, label, título, mensaje, placeholder o cualquier string visible al usuario.
---

# Texto multidioma (i18n)

Regla de proyecto (ver `ApprendeVr/Documentation/project.rules`): **todo texto que se muestre en
la aplicación debe salir de los archivos de localización (`locales`), nunca hardcodeado en JSX.**
Las claves de esos textos se crean **en español**, sin importar el idioma del contenido.

## Mecanismo activo (el correcto)

- Archivos de traducción: `src/locales/es.json`, `src/locales/en.json`, `src/locales/br.json`.
  Cada uno es un objeto `{ "translation": { ... } }`, con claves anidadas permitidas
  (ej. `"menu": { "title": "..." }`).
- Provider/context: `src/components/VRConfig/VRLanguageContext.jsx`. Carga **todos** los
  `../../locales/*.json` dinámicamente con `import.meta.glob` y expone
  `useVRLanguage()` → `{ t, currentLang, setCurrentLang, availableLanguages, isLoading }`.
- `t('clave')` resuelve claves anidadas con notación de punto (`'menu.title'`) contra el idioma
  actual. **Si la clave no existe, devuelve la propia clave** (fallback silencioso).
- **Ejemplo de referencia**: el título de la app, `appName`, se renderiza con `t('appName')` en
  `src/components/VRDisplay.jsx`. Ese es el patrón canónico a replicar en todo texto nuevo.
- **Punto de cambio de idioma**: la tuerca ⚙️ de la esquina superior derecha
  (`src/components/VRConfig/VRConfig.jsx`), que abre el panel de configuración y monta el
  `<select>` de `src/components/VRConfig/VRLanguages.jsx` (llama a `setCurrentLang`).

## Pasos para agregar un texto nuevo

1. **Definir la clave en español** (según `project.rules`). Si pertenece a una sección/dominio,
   anidarla (ej. `menu.language`, `home.backToHome`). No reusar una clave existente para un
   significado distinto.
2. **Agregar la clave en los TRES archivos** `es.json`, `en.json` y `br.json` con la traducción
   correspondiente a cada idioma. Si falta en alguno, ese idioma mostrará la clave cruda en
   pantalla (fallback).
3. **Consumirla** con `const { t } = useVRLanguage();` y renderizar `{t('clave')}`. El componente
   debe estar dentro de `<VRLanguageProvider>` (lo provee `App.jsx` en la raíz).

```jsx
import { useVRLanguage } from '../../components/VRConfig/VRLanguageContext';

const MiVista = () => {
  const { t } = useVRLanguage();
  return <button>{t('home.backToHome')}</button>;
};
```

## Verificación (obligatoria antes de terminar)

Tras agregar o modificar textos, correr el validador para garantizar integridad entre código y
locales:

```bash
cd ApprendeVr/frontend
npm run check:i18n            # parse JSON + claves usadas en los 3 idiomas + simetría es/en/br
npm run check:i18n:hardcoded  # además, heurística de strings visibles hardcodeados en JSX
```

El validador (`scripts/check-i18n.mjs`) chequea:

1. Que `es.json`, `en.json` y `br.json` sean JSON válido con raíz `translation`.
2. Que **toda clave** usada en código vía `t('clave')` / `t("clave")` exista en los **tres**
   idiomas (detecta typos y claves que faltan en un idioma).
3. Que las claves de los tres locales sean **simétricas** (misma estructura, sin drift).
4. `--hardcoded`: heurística de strings visibles en JSX que se escaparon de `t()`.

Sale con código 1 si hay errores (no continuar sin corregirlos). Las advertencias de
`--hardcoded` son heurísticas: revisar cada una y decidir si es texto visible (migrar) o valor
técnico/comentario (ignorar).

## Gotchas

- **`t()` devuelve la clave si no la encuentra**: un typo en la clave o una clave que falta en un
  idioma se muestra tal cual en la UI. El validador (`npm run check:i18n`) lo atrapa antes.
- **`src/i18n.js` (i18next) es legado y NO es el flujo activo**: solo registra `en` y no se usa en
  el flujo real. El mecanismo vivo es `VRLanguageContext`. No agregar textos ahí ni usar
  `react-i18next` para strings nuevos.
- **Solo el título (`appName`) y los labels del menú de configuración (tuerca ⚙️) están
  migrados.** Los botones de `VRDisplay.jsx` ("Mostrar Domo", "Ambas Vistas", "AR Stereo"), los
  `text` de los `VRButton` en `App.jsx` y demás strings hardcodeados siguen sin traducir. No
  copiar ese patrón: todo texto nuevo va a locales.
- Textos dentro de la escena 3D (`drei` `<Text>`): mismo mecanismo — obtener el string con `t()`
  y pasarlo como prop (ver `VRTextTranslation.jsx` como ejemplo de texto traducible en 3D).
