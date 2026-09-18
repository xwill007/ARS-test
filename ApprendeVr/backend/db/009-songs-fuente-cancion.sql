-- Requerimiento 014 (ampliación): agrega `fuente_cancion` a `canciones_vr` para distinguir de
-- dónde se reproduce cada canción ('local' = archivo en public/videos/karaoke/, 'youtube' = URL
-- de YouTube, otras fuentes futuras se agregan como nuevos valores sin otra migración de esquema).
-- `archivo_cancion` deja de tener un único significado fijo (nombre de archivo local): cuando
-- `fuente_cancion = 'youtube'` guarda la URL completa en esa misma columna, en vez de una columna
-- paralela por fuente — por eso pasa a ser NULLable (hasta ahora era NOT NULL).
--
-- Se usa `MODIFY` (no `CHANGE`) para solo relajar el NOT NULL, preservando el resto de la
-- definición de la columna (tipo varchar(255), charset/collation heredados de la tabla).
ALTER TABLE canciones_vr
  ADD COLUMN fuente_cancion varchar(50) NOT NULL DEFAULT 'local' AFTER archivo_cancion,
  MODIFY archivo_cancion varchar(255) NULL;
