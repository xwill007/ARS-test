// Definición de colores y fuentes directamente en JS
const COLORS_LIGHT = {
  primary: { main: '#547a54', contrast: '#ffffff' },
  secondary: { main: '#00ffff', contrast: '#000000' },
  accent: { main: '#ff0000', contrast: '#ffffff' },
  background: { main: '#ffffff', contrast: '#000000' },
  surface: { main: '#f0f0f0', contrast: '#000000' },
};
const COLORS_DARK = {
  primary: { main: '#2e4a2e', contrast: '#ffffff' },
  secondary: { main: '#00cccc', contrast: '#000000' },
  accent: { main: '#ff5555', contrast: '#000000' },
  background: { main: '#222222', contrast: '#ffffff' },
  surface: { main: '#333333', contrast: '#ffffff' },
};
// Cambia los valores a rutas de archivos de fuente reales para Drei
const FONT_PRIMARY_LIGHT = '/fonts/RockSalt.ttf';
const FONT_SECONDARY_LIGHT = '/fonts/Roboto.ttf'; // Si tienes otra fuente secundaria
const FONT_PRIMARY_DARK = '/fonts/Aclonica.ttf';
const FONT_SECONDARY_DARK = '/fonts/Ultra.ttf';

export const themeLight = {
  colors: COLORS_LIGHT,
  fonts: {
    primary: FONT_PRIMARY_LIGHT,
    secondary: FONT_SECONDARY_LIGHT,
  },
};

export const themeDark = {
  colors: COLORS_DARK,
  fonts: {
    primary: FONT_PRIMARY_DARK,
    secondary: FONT_SECONDARY_DARK,
  },
};

// Aplica la clase global al body para el tema
export function applyThemeClass(themeKey) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');
  if (themeKey === 'themeLight') body.classList.add('theme-light');
  if (themeKey === 'themeDark') body.classList.add('theme-dark');
}