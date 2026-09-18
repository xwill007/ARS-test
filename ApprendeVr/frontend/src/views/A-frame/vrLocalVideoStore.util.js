// Almacén del contenido binario de un video elegido desde el dispositivo del usuario
// (Requerimiento 014, ampliación: "cargar en local una canción descargada"). A pedido del usuario,
// este video NO se sube a ningún servidor — vive solo en este navegador/dispositivo, para esta
// persona. `localStorage` no sirve para esto (límite típico ~5-10MB, muy por debajo de un video),
// así que se usa IndexedDB, que sí soporta blobs grandes y está disponible tanto en navegadores de
// escritorio como en Chrome/Safari de dispositivos móviles (que es el otro requisito explícito del
// usuario: "que además funcione en dispositivo mobil").
//
// Se guarda como `ArrayBuffer` (no como `Blob` directo) porque versiones viejas de Safari/iOS
// tuvieron bugs conocidos guardando `Blob`/`File` tal cual en IndexedDB (silenciosamente corrompían
// o perdían el dato) — `ArrayBuffer` es el formato más compatible entre navegadores, y se
// reconstruye como `Blob` (con su `type` original) recién al leer.
const DB_NAME = 'apprendevr-local-videos';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no disponible en este navegador.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Guarda `file` (un `File`/`Blob` del `<input type="file">`) bajo la clave `id`. Devuelve una
// promesa que resuelve al terminar — el llamador decide qué mostrar mientras tanto (puede tardar
// unos segundos con videos grandes).
export async function saveLocalVideo(id, file) {
  const buffer = await file.arrayBuffer();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ buffer, type: file.type, name: file.name }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Devuelve un `Blob` reproducible (mismo `type` original) o `null` si `id` no existe en este
// dispositivo (por ejemplo, otro dispositivo/navegador que solo ve el título en el catálogo local
// pero nunca guardó el video acá).
export async function getLocalVideo(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      const entry = req.result;
      resolve(entry ? new Blob([entry.buffer], { type: entry.type }) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalVideo(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
