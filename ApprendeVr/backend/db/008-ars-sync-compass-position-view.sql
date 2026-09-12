-- Requerimiento 013 (hallazgo): agrega la vista `ars-sync-compass-position` (posición 3D de la
-- brújula de la vista de prueba "AR-SYNC", ver SyncConfigCompassMenu.jsx/SyncStereoTestView.jsx) al
-- catálogo `settings_views`. Gracias a la normalización de la migración 004, esto NO requiere
-- ningún `ALTER TABLE` sobre `user_settings` — solo esta fila nueva en el catálogo.
--
-- Sin esta fila, el frontend (que ya guardaba/recuperaba con la clave
-- `ars-sync-compass-position` desde el Requerimiento 013) recibía `400 UNKNOWN_VIEW` del backend en
-- cada `GET`/`PUT`, por lo que la posición de la brújula nunca se persistía ni recuperaba.
--
-- `SET NAMES utf8mb4` explícito por el mismo motivo que en las migraciones 004/005: evita que el
-- charset del cliente `mysql` (latin1 por defecto en este entorno) doble-codifique las tildes del
-- literal de abajo al guardarlo.
SET NAMES utf8mb4;

INSERT INTO settings_views (view_key, label) VALUES
  ('ars-sync-compass-position', 'Posición 3D de la brújula de la vista de prueba AR-SYNC');
