# Problemas e incidentes

## 1. `language` se guardaba como `NULL` explícito en vez de aplicar el default de la BD ('ingles')

**Fecha:** 2026-09-14 (durante la implementación de la Fase 1, detectado en verificación manual
contra la BD real, no por un test unitario).

**Problema:** `SongsService.create()` armaba el objeto a insertar con `language: dto.language ??
null`, es decir, cuando el DTO no traía `language`, se mandaba `null` explícito. Al probar
`POST /api/songs` con solo `{ title, fileName }` contra la BD real (`docker compose up` + `curl`),
la fila quedaba con `idioma_cancion = NULL` en vez de `'ingles'` (el `DEFAULT 'ingles'` de la
columna, ver `english_vr.sql`).

**Causa:** un `NULL` explícito en el `INSERT` de MySQL no dispara el `DEFAULT` de la columna —
solo se aplica cuando la columna se omite por completo del `INSERT`. TypeORM refleja fielmente en
el `INSERT` generado las propiedades presentes en el objeto pasado a `repository.create()`/`save()`,
así que `language: null` viajaba tal cual.

**Solución:** `SongsService.create()` ahora arma el objeto a insertar solo con `title`/`author`/
`fileName`, y agrega la clave `language` únicamente si `dto.language` viene con un valor —
omitiéndola por completo cuando no, para que TypeORM no la incluya en el `INSERT` y la BD aplique
su `DEFAULT`. Se verificó contra la BD real (`docker exec ... mysql ... SELECT`) que una canción
creada sin `language` queda con `idioma_cancion = 'ingles'`. Se actualizó `songs.service.spec.ts`
para reflejar el comportamiento correcto (ya no espera `language: null` en la llamada a `create()`
del repo).

**Estado:** resuelto, con test de regresión (`'includes language in the entity only when the DTO
provides it'` en `songs.service.spec.ts`).

## 2. Race entre la carga inicial de la lista y la respuesta de `GET /api/songs`: pisaba la selección del usuario

**Fecha:** 2026-09-14, reportado por el usuario en AR-SYNC (`mirror-fix`): "se ha perdido la
sincronizacion de las canciones en ambos paneles al dar click con el cursor circular para
reproducir en la lista, ademas elimina la cancion que no esta en base de datos".

**Problema:** `VRKaraokeAf._initSongList()` (consumidor de `getSongs()`, ver
`vrSongsApi.util.js`) construye la lista DOS veces: primero de inmediato con el catálogo local +
`videoList` (schema), y de nuevo cuando responde `GET /api/songs` (red, timing variable por
panel). `_buildSongListUI()` terminaba SIEMPRE con un bloque incondicional que seleccionaba y
reproducía la PRIMERA canción de la lista recién reconstruida. Si el usuario ya había clickeado
una canción de la lista (por ejemplo una agregada localmente, que no existe en el backend) ANTES
de que terminara de responder `getSongs()`, ese segundo `_buildSongListUI()` pisaba en silencio la
selección real del usuario apenas terminaba de cargar, saltando de vuelta a la primera canción.

**Por qué afectaba la sincronización entre paneles:** en AR-SYNC cada panel (izquierdo/derecho) es
una instancia independiente de `vr-karaoke-af` dentro de su propio iframe, cada una con su propia
llamada a `getSongs()` — el tiempo de respuesta de red no es el mismo en los dos. Cada panel podía
terminar "pisado" por su propio rebuild en un momento distinto, reproduciendo canciones distintas
sin que ningún mensaje `postMessage` lo causara (el puente de sincronización de
`aframe-overlay-modules.js` solo relaya play/pause/seek del video YA cargado en cada panel — nunca
sincronizó CUÁL canción está seleccionada, ver ese archivo).

**Por qué parecía que "elimina la canción que no está en base de datos":** la canción local nunca
se borraba de verdad — `getLocalSongs()`/`addLocalSong()` (`vrSongCatalog.util.js`, respaldadas en
`localStorage`) no se tocan en ningún punto de este flujo. Lo que ocurría es que, al perder la
selección/reproducción activa (reemplazada por la primera canción de la lista, casi siempre una
del backend), la canción local dejaba de estar resaltada/sonando — daba la impresión de haber
desaparecido sin haberlo hecho realmente.

**Solución:** en `_buildSongListUI()`, el bloque final ahora distingue si ya hay una canción
cargada (`this._currentSong`, seteado por `loadVideo()`) antes de decidir qué hacer:
- Si ya hay una canción cargada (rebuild posterior al mount inicial, sea por la respuesta de
  `getSongs()` o por `cancion-agregada`): NO se reemplaza — solo se vuelve a resaltar su botón en
  la lista reconstruida, buscándolo por `fileName` (cada botón ahora guarda `button._fileName` al
  crearse, porque las referencias de `<a-plane>` anteriores ya no existen tras el rebuild).
- Si es la primera vez que se construye la lista en esta instancia (no hay ninguna canción
  cargada todavía): se mantiene el comportamiento original, selecciona y reproduce la primera.

**Estado:** resuelto (`VRKaraokeAf.js`, `_buildSongListUI`). `npm run build` (frontend) verde. No
se pudo reproducir de punta a punta en el navegador en esta sesión (tab compartida con otra sesión
activa del usuario en simultáneo — ver mismo tipo de limitación documentada en
`Documentation/Requerimientos/2-Developing/013-menu-configuracion-brujula-3d-ar-sync/problems_solutions.md`),
la causa raíz y el fix están confirmados por lectura directa del código (la condición nueva es
mecánicamente imposible de saltear en el flujo descrito), pero queda pendiente una verificación
manual en dos paneles reales antes de marcarlo como aceptado.
