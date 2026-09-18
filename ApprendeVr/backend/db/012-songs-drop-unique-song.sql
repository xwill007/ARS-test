-- Hallazgo real (Requerimiento 014, ampliación): el dump legacy (`english_vr.sql`, línea ~1124)
-- SÍ trae `ADD UNIQUE KEY unique_song (titulo_cancion, autor_cancion)` — contra lo documentado en
-- requerimiento.md sección 5 ("la tabla real importada en Docker... sin esa constraint"), que
-- resultó ser una suposición incorrecta (nunca se verificó contra el dump real en ese momento).
--
-- Esta constraint global rompe el pedido del usuario de que dos usuarios distintos puedan tener
-- cada uno una canción `'local'`/`'youtube'` con el mismo título+autor sin conflicto (ver
-- `SongsService.create()`, `PRIVATE_SOURCES`): aunque el chequeo de la app no encuentre duplicado
-- (está acotado por `id_usuario_cancion`), el `INSERT` real fallaría igual contra esta UNIQUE KEY
-- de la BD con un error crudo de MySQL (`ER_DUP_ENTRY`), no con el `409 SONG_ALREADY_EXISTS`
-- controlado que ya devuelve la app.
--
-- Se elimina para que la aplicación sea la única fuente de verdad de unicidad (documentado desde
-- el Requerimiento 014 original: "Unicidad validada en el service, no en la BD") — ahora sí es
-- cierto, en vez de una suposición no verificada.
ALTER TABLE canciones_vr
  DROP INDEX unique_song;
