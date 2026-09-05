# Estrategia y casos de test

## Estrategia

Vitest + `@testing-library/react` + jsdom (ver "Diseño técnico" en `requerimiento.md`). Tests
unitarios colocalizados junto al archivo que testean, sufijo `.test.js`/`.test.jsx`. Cobertura
mínima 80% (statements/branches/functions/lines) sobre los archivos no excluidos.

## Qué se testea vs. qué no

| Tipo | ¿Se testea unitariamente? | Mecanismo |
|---|---|---|
| Funciones puras (`*.util.js`) | Sí | Vitest, sin render, casos normales + de borde. |
| Componentes HTML puros (`Boton`, `Input`, `Select`, `Formulario`, `LoginRegisterForm`, `UbicacionControl`) | Sí | Vitest + `@testing-library/react` (`render`/`screen`/`userEvent`), en jsdom. |
| Componentes r3f/Three.js (`VRButton`, vistas con `<Canvas>`) | No — excluidos explícitamente de cobertura | Verificación manual en navegador real (Chrome DevTools MCP), como ya se practicó durante el requerimiento 007. |
| Integridad de i18n (claves simétricas es/en/br) | Sí, pero fuera de este framework | `npm run check:i18n` (script Node existente, no tocado por este requerimiento). |

## Casos de test iniciales (`LoginRegisterForm.util.js`)

| Función | Caso | Resultado esperado |
|---|---|---|
| `isValidEmail` | email con formato válido (`a@b.com`) | `true` |
| `isValidEmail` | string sin `@` o sin dominio | `false` |
| `isValidPassword` | 6 o más caracteres | `true` |
| `isValidPassword` | menos de 6 caracteres | `false` |
| `isValidAge` | entero entre 1 y 120 | `true` |
| `isValidAge` | `0`, negativo, no entero, string vacío | `false` |
| `validateRegisterForm` | payload completo y válido | objeto de errores vacío (`{}`) |
| `validateRegisterForm` | campos requeridos faltantes, edad inválida, contraseñas que no coinciden | error en el campo correspondiente (`required`/`invalidAge`/`passwordsDontMatch`, etc.) |
| `validateLoginForm` | email y password válidos | objeto de errores vacío (`{}`) |
| `validateLoginForm` | email inválido o password vacío | error en el campo correspondiente |

## Futuro (fuera de alcance de este requerimiento)

- Ir agregando `.test.js`/`.test.jsx` a cada componente de `src/components/` a medida que se
  toquen (no se migra retroactivamente de una sola vez).
- Evaluar si conviene e2e (Playwright u otro) para flujos completos más adelante — no evaluado
  todavía.
