-- Requerimiento 015 (edición de tiempos de frases, overlay "Song Text"): la columna
-- `tiempo_frase` de `frases_vr` era `TIME` (precisión de segundo entero, ver dump `english_vr.sql`),
-- lo que obligaba a redondear el tiempo capturado del video a segundos enteros y perdía la
-- precisión necesaria para sincronizar la letra con el canto. Se la promueve a `TIME(1)` para
-- guardar décimas de segundo ('HH:MM:SS.d'), que es la precisión con la que el frontend captura el
-- tiempo al pausar la canción.
--
-- Se usa `MODIFY` (no `CHANGE`) para preservar el nombre y el resto de la definición (charset/
-- collation heredados de la tabla), cambiando solo la precisión fraccionaria.
ALTER TABLE frases_vr
  MODIFY tiempo_frase TIME(1) NOT NULL;
