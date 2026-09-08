// Requerimiento 012: pedir/salir de pantalla completa al entrar/salir de las vistas de prueba
// AR-TEST/AR-SYNC de mirror-fix. Mismo patrón (y mismos prefijos vendor) que enterFullscreen() en
// ApprendeVr/frontend/src/App.jsx, pero como helper propio de esta carpeta — mirror-fix se
// mantiene deliberadamente aislado del resto de la app (ver comentario de ARTestMirrorButton.jsx),
// así que no se importa desde App.jsx.

export function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

export function exitFullscreen() {
  if (!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
    return;
  }
  if (document.exitFullscreen) document.exitFullscreen();
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
  else if (document.msExitFullscreen) document.msExitFullscreen();
}
