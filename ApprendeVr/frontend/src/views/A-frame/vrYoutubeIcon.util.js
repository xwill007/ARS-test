// Icono de YouTube reutilizable (Requerimiento 015): registra el componente A-Frame
// `youtube-icon`, que pinta el logo (rectángulo rojo con puntas redondeadas + triángulo de play
// blanco) sobre un <canvas> y lo aplica como textura a la entidad a la que se adjunte.
//
// Reutilizable en cualquier escena A-Frame: basta con `<a-plane youtube-icon></a-plane>` (o
// adjuntarlo a cualquier entidad con material). El canvas se dibuja en alta resolución (256x176,
// proporción ~16:11 del logo real) y se redimensiona al tamaño de la entidad, así no hay que cargar
// un asset externo ni depender de una geometría "rounded" que el core de A-Frame no trae (no existe
// `a-rounded`; el rectángulo redondeado se dibuja a mano con curvas cuadráticas sobre el canvas).
//
// El rectángulo redondeado + triángulo van en UNA sola textura (no son dos meshes), así no hay
// z-fighting entre el fondo y el triángulo y el icono es un único elemento en la escena.

const YOUTUBE_ICON_RED = '#FF0000';
const YOUTUBE_ICON_PLAY = '#FFFFFF';

// Resolución interna del canvas: más ancho que alto, como el logo real (~16:11).
const ICON_W = 256;
const ICON_H = 176;

AFRAME.registerComponent('youtube-icon', {
  schema: {
    // Color del fondo (rectángulo redondeado). YouTube usa rojo puro.
    color: { type: 'color', default: YOUTUBE_ICON_RED },
    // Color del triángulo de play.
    playColor: { type: 'color', default: YOUTUBE_ICON_PLAY },
    // Radio de las puntas redondeadas, como fracción de la ALTURA (0 = recto, 0.5 = semicírculo).
    cornerRadius: { type: 'number', default: 0.22 },
    // Tamaño del triángulo de play, como fracción de la altura del rectángulo.
    playSize: { type: 'number', default: 0.4 },
  },

  update: function () {
    this._draw();
  },

  _draw: function () {
    const three = AFRAME.THREE;
    const w = ICON_W;
    const h = ICON_H;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const r = Math.max(0, Math.min(0.5, this.data.cornerRadius)) * h;

    // Fondo: rectángulo rojo con puntas redondeadas (curvas cuadráticas en cada esquina).
    ctx.fillStyle = this.data.color;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Triángulo de play centrado, con un leve offset óptico a la derecha (como el logo real).
    const ps = this.data.playSize * h;
    const cx = w / 2 + ps * 0.1;
    const cy = h / 2;
    ctx.fillStyle = this.data.playColor;
    ctx.beginPath();
    ctx.moveTo(cx - ps * 0.42, cy - ps / 2);
    ctx.lineTo(cx - ps * 0.42, cy + ps / 2);
    ctx.lineTo(cx + ps * 0.58, cy);
    ctx.closePath();
    ctx.fill();

    const texture = new three.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = three.LinearFilter;
    texture.magFilter = three.LinearFilter;

    // `transparent: true` para que las esquinas fuera del cuadrado redondeado no se pinten.
    this.el.setAttribute('material', {
      src: texture,
      transparent: true,
      color: '#FFFFFF',
    });

    if (this._texture) { try { this._texture.dispose(); } catch (e) { /* ignore */ } }
    this._texture = texture;
  },

  remove: function () {
    if (this._texture) { try { this._texture.dispose(); } catch (e) { /* ignore */ } }
  },
});
