-- Requerimiento 015 (trazabilidad): agrega `url_cancion` a `canciones_vr` para guardar la URL de
-- ORIGEN del video de forma explícita y estándar, independientemente del proveedor (YouTube hoy,
-- Vimeo u otras plataformas a futuro). `archivo_cancion` sigue siendo CÓMO se reproduce (nombre de
-- archivo local, clave de IndexedDB o URL según `fuente_cancion`); `url_cancion` es DE DÓNDE vino
-- la canción (la URL original), y persiste incluso después de que la descarga a local/servidor
-- sobreescriba `archivo_cancion`.
--
-- Nullable: las canciones del dump legacy y las que no provienen de una URL (p. ej. `source:
-- 'server'` cargadas a mano, o `'local'` desde un archivo del dispositivo) no tienen URL de origen.
--
-- Nombre `url_cancion` (no `youtube_url`): es agnóstico al proveedor, siguiendo la convención
-- `_cancion` de esta tabla (`titulo_cancion`, `autor_cancion`, `archivo_cancion`, `fuente_cancion`,
-- `idioma_cancion`).
ALTER TABLE canciones_vr
  ADD COLUMN url_cancion varchar(255) NULL AFTER archivo_cancion;

-- Backfill: las canciones `fuente_cancion = 'youtube'` que ya existen guardan la URL en
-- `archivo_cancion` (diseño anterior del Requerimiento 014, antes de existir `url_cancion`); se
-- copia a `url_cancion` para no perder la trazabilidad de origen al migrar. No-op en instalaciones
-- nuevas (no hay canciones 'youtube' preexistentes).
UPDATE canciones_vr SET url_cancion = archivo_cancion
WHERE fuente_cancion = 'youtube' AND url_cancion IS NULL;
