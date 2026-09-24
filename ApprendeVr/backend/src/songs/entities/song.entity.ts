import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapea `canciones_vr` tal como existe en el dump legacy de `english_vr` (esquema en español, sin
// renombrar — mismo criterio que `usuarios`, ver users/entities/user.entity.ts).
@Entity({ name: 'canciones_vr' })
export class Song {
  @PrimaryGeneratedColumn({ name: 'id_cancion' })
  id: number;

  @Column({ name: 'titulo_cancion' })
  title: string;

  @Column({ name: 'autor_cancion' })
  author: string;

  // Nombre del archivo local (fuente 'local') o URL completa (fuente 'youtube'), según `source`.
  @Column({ name: 'archivo_cancion', nullable: true })
  fileName: string | null;

  // URL de ORIGEN del video (Requerimiento 015, trazabilidad): de dónde vino la canción
  // (YouTube/Vimeo/etc.), independiente del proveedor. Se conserva aunque `archivo_cancion` cambie
  // (p. ej. tras descargar un video de YouTube a local/servidor, `fileName` pasa a ser el `.mp4`
  // pero `url` sigue guardando la URL original). Nullable: las canciones que no provienen de una
  // URL no la tienen.
  @Column({ name: 'url_cancion', type: 'varchar', length: 255, nullable: true })
  url: string | null;

  // Multi-source (Requerimiento 015, ampliación): lista separada por comas de fuentes, p. ej.
  // 'server' (archivo real en public/videos/karaoke/ del servidor, visible para cualquier
  // usuario), 'local' (video que vive solo en el IndexedDB del dispositivo de `userId`, nunca en
  // el servidor), 'youtube' (URL de un video de YouTube, reproducible en el visor embebido) o
  // combinaciones como 'youtube,server' (descargada de YouTube al servidor, conservando su origen).
  // 'local' y 'youtube' son privadas: solo las ve el usuario que las creó (Requerimiento 014,
  // ampliación — ver `userId`/`SongsService.findMine()`). Default 'server' en la BD (ver
  // db/011-songs-id-usuario.sql, que renombró el default original 'local' de
  // db/009-songs-fuente-cancion.sql a 'server' al introducir el nuevo significado).
  @Column({ name: 'fuente_cancion', type: 'varchar', length: 50, default: 'server' })
  source: string;

  // Usuario que creó la canción (Requerimiento 014, ampliación) — nullable: las 3 canciones del
  // dump legacy y cualquier canción creada antes de esta columna no tienen usuario asociado.
  // Imprescindible para `source: 'local'`/`'youtube'` (ver arriba): es la clave para filtrar "las
  // canciones privadas DE ESTE usuario" en `SongsService.findMine()` / `GET /songs/mine`, en vez
  // de mezclarlas con el catálogo público (`source: 'server'`) de `GET /songs`.
  //
  // Nombre de columna `id_usuario_cancion` (no `id_usuario` a secas): sigue la convención de esta
  // tabla, donde toda columna propia lleva el sufijo `_cancion`.
  @Column({ name: 'id_usuario_cancion', type: 'int', nullable: true })
  userId: number | null;

  // Nullable en el dump (sin NOT NULL): la BD la completa con CURRENT_TIMESTAMP() si no se envía.
  @Column({ name: 'fecha_hora_cancion', type: 'datetime', nullable: true })
  dateTime: Date | null;

  // Nullable en el dump (sin NOT NULL): la BD la completa con 'ingles' si no se envía.
  @Column({ name: 'idioma_cancion', type: 'varchar', length: 50, nullable: true })
  language: string | null;
}
