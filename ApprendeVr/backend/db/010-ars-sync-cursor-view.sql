-- Requerimiento 016: agrega la vista `ars-sync-cursor` (apariencia/comportamiento del cursor
-- visible de la vista de prueba "AR-SYNC" — posición relativa a la cámara, escala, tiempo de
-- activación por mirada fija, color, geometría y visibilidad, ver SyncConfigCompassMenu.jsx) al
-- catálogo `settings_views`. Gracias a la normalización de la migración 004, esto NO requiere
-- ningún `ALTER TABLE` sobre `user_settings` — solo esta fila nueva en el catálogo.
--
-- `SET NAMES utf8mb4` explícito por el mismo motivo que en las migraciones 004/005/008: evita que
-- el charset del cliente `mysql` (latin1 por defecto en este entorno) doble-codifique las tildes
-- del literal de abajo al guardarlo.
SET NAMES utf8mb4;

INSERT INTO settings_views (view_key, label) VALUES
  ('ars-sync-cursor', 'Cursor de la vista de prueba AR-SYNC');
