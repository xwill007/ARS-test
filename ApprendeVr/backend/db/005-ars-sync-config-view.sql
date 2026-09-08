-- Requerimiento 012 (ampliación): agrega la vista `ars-sync-config` (separación/ancho/alto de los
-- paneles, pestaña "Configuración" de SyncConfigMenu.jsx) al catálogo `settings_views`. Gracias a
-- la normalización de la migración 004, esto ya NO requiere ningún `ALTER TABLE` sobre
-- `user_settings` — solo esta fila nueva en el catálogo.
--
-- `SET NAMES utf8mb4` explícito por el mismo motivo que en la migración 004: evita que el charset
-- del cliente `mysql` (latin1 por defecto en este entorno) doble-codifique las tildes del literal
-- de abajo al guardarlo.
SET NAMES utf8mb4;

INSERT INTO settings_views (view_key, label) VALUES
  ('ars-sync-config', 'Separación/ancho/alto de los paneles de la vista de prueba AR-SYNC');
