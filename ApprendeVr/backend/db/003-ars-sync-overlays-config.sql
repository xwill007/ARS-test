-- Requerimiento 012 (ampliación): agrega la vista `ars-sync-overlays` (selección de overlays
-- marcados en el menú de la vista de prueba "AR-SYNC", ver SyncConfigMenu.jsx/
-- SyncStereoTestView.jsx) a `user_settings`, con su propia columna — mismo patrón que
-- `evaluation_panel_config` en 002-evaluation-panel-config.sql.
ALTER TABLE user_settings
  ADD COLUMN ars_sync_overlays_config JSON NULL AFTER evaluation_panel_config;
