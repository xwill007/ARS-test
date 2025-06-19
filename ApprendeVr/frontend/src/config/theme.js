// Utilidad para convertir color CSS (#rrggbb) a número (0xrrggbb)
function cssVarToHexNumber(cssVar) {
  if (!cssVar) return undefined;
  const hex = cssVar.trim().replace('#', '');
  return parseInt(hex, 16);
}

// Gestión de fuentes: fontPrimary y fontSecondary desde CSS
function cssVarFont(styles, varName, fallback) {
  const val = styles.getPropertyValue(varName).trim();
  return val || fallback;
}

// Gestión de variantes: para cada color principal, define variantes (main, contrast, etc.)
export function getThemeFromCSS() {
  const styles = getComputedStyle(document.documentElement);
  return {
    colors: {
      primary: {
        main: cssVarToHexNumber(styles.getPropertyValue('--primary')),
        contrast: cssVarToHexNumber(styles.getPropertyValue('--on-primary')),
      },
      secondary: {
        main: cssVarToHexNumber(styles.getPropertyValue('--secondary')),
        contrast: cssVarToHexNumber(styles.getPropertyValue('--on-secondary')),
      },
      accent: {
        main: cssVarToHexNumber(styles.getPropertyValue('--accent')),
        contrast: cssVarToHexNumber(styles.getPropertyValue('--on-accent')),
      },
      background: {
        main: cssVarToHexNumber(styles.getPropertyValue('--background')),
        contrast: cssVarToHexNumber(styles.getPropertyValue('--on-background')),
      },
      surface: {
        main: cssVarToHexNumber(styles.getPropertyValue('--surface')),
        contrast: cssVarToHexNumber(styles.getPropertyValue('--on-surface')),
      },
      // Colores legacy
      white: cssVarToHexNumber(styles.getPropertyValue('--white')),
      red: cssVarToHexNumber(styles.getPropertyValue('--red')),
      cyan: cssVarToHexNumber(styles.getPropertyValue('--cyan')),
      green: cssVarToHexNumber(styles.getPropertyValue('--green')),
      black: cssVarToHexNumber(styles.getPropertyValue('--black')),
      blue: cssVarToHexNumber(styles.getPropertyValue('--blue')),
    },
    fonts: {
      primary: cssVarFont(styles, '--font-primary', 'sans-serif'),
      secondary: cssVarFont(styles, '--font-secondary', 'serif'),
    },
  };
}

// Temas predefinidos: light y dark
export const themeLight = {
  colors: {
    primary: { main: 0x547a54, contrast: 0xffffff },
    secondary: { main: 0x00ffff, contrast: 0x000000 },
    accent: { main: 0xff0000, contrast: 0xffffff },
    background: { main: 0xffffff, contrast: 0x000000 },
    surface: { main: 0xf0f0f0, contrast: 0x000000 },
    // Colores legacy
    white: 0xffffff,
    red: 0xff0000,
    cyan: 0x00ffff,
    green: 0x547a54,
    black: 0x000000,
    blue: 0x0000ff,
  },
  fonts: {
    primary: 'Roboto, Arial, sans-serif',
    secondary: 'Georgia, serif',
  },
};

export const themeDark = {
  colors: {
    primary: { main: 0x2e4a2e, contrast: 0xffffff },
    secondary: { main: 0x00cccc, contrast: 0x000000 },
    accent: { main: 0xff5555, contrast: 0x000000 },
    background: { main: 0x222222, contrast: 0xffffff },
    surface: { main: 0x333333, contrast: 0xffffff },
    // Colores legacy
    white: 0x222222,
    red: 0xff5555,
    cyan: 0x00cccc,
    green: 0x2e4a2e,
    black: 0x000000,
    blue: 0x2222aa,
  },
  fonts: {
    primary: 'Roboto, Arial, sans-serif',
    secondary: 'Georgia, serif',
  },
};