---
name: componentes-frontend
description: Define cómo crear y organizar componentes React en ApprendeVr/frontend (Atomic Design + colocation por vista). Usar cuando el usuario pida crear, agregar, mover o refactorizar un componente, subcomponente, formulario o vista dentro de ApprendeVr/frontend.
---

# Arquitectura de componentes de ApprendeVr/frontend

Combina dos patrones conocidos:

- **Atomic Design** (átomo → molécula → organismo → vista): un botón recibe props simples
  (forma, color, texto, acción); un formulario compone botones, inputs y listas; una vista
  compone formularios y otros componentes.
- **Colocation por vista**: cada componente vive en su propia carpeta junto a sus
  subcomponentes exclusivos, para que "encontrar el código de X" sea siempre "abrir la
  carpeta X" — sin buscar en múltiples ubicaciones.

## Dónde va cada componente

```
src/components/<Nombre>/           # COMPARTIDO: usable desde cualquier vista
    <Nombre>.jsx
    index.js                       # barrel: export { default } from './<Nombre>'

src/views/<Vista>/
    <Vista>.jsx
    components/<Nombre>/           # LOCAL: exclusivo de esta vista
        <Nombre>.jsx
        index.js
        components/<SubNombre>/    # anidar solo si <SubNombre> es exclusivo de <Nombre>
```

Regla de decisión: si el componente se va a usar en 2+ vistas (o es genérico por diseño:
botón, input, card, modal), va en `src/components/`. Si es específico de una sola vista o
formulario, va en `views/<Vista>/components/`, anidado tan profundo como refleje su uso real
(un subcomponente de un formulario va dentro de la carpeta del formulario, no suelto).

Ya existen ejemplos parciales de este patrón en el repo: `components/VRViews`, `components/VRGirl`,
`components/VRConfig` (compartidos) y `views/ARs/ARScomponents`, `views/A-frame/components`
(locales). Nuevos componentes deben seguir la misma lógica de ubicación.

## Reglas de composición

1. **Props explícitos, no prop-drilling profundo.** Un botón recibe `shape`, `color`, `text`,
   `onAction` (o equivalente) como props directos. Un formulario compone sus inputs/listas vía
   `children` o props de configuración, no reimplementando su lógica interna.
2. **Un componente compartido nunca importa nada de `views/`.** La dependencia va en un solo
   sentido: vistas → componentes compartidos, nunca al revés.
3. **Copiar y pegar para modificar es una técnica válida, no duplicación a limpiar.** Si un
   componente compartido casi sirve pero necesita un cambio específico de una vista, se copia
   su carpeta completa dentro de `views/<Vista>/components/`, se renombra, y se modifica ahí.
   No se edita el componente compartido "por si acaso" ni se le agregan props condicionales
   solo para un caso de uso.
4. **Cada carpeta es autocontenida.** JSX, estilos (si aplica) y subcomponentes exclusivos
   viven juntos en la carpeta del componente. Nada de un componente cuyo subcomponente vive en
   otra carpeta lejana.
5. **`index.js` como barrel en cada carpeta de componente**, para que el import quede
   `import Boton from 'components/Boton'` en vez de apuntar al archivo `.jsx` directamente.

## Al crear un componente nuevo

1. Decidir compartido vs. local según la regla de decisión de arriba.
2. Crear la carpeta `<Nombre>/` con `<Nombre>.jsx` + `index.js`.
3. Si el componente tiene subcomponentes que solo él usa, crearlos anidados dentro de su
   propia carpeta (`<Nombre>/components/<SubNombre>/`), siguiendo el mismo patrón.
4. Si el componente nuevo es una copia modificada de uno compartido, copiar toda la carpeta
   (no solo el `.jsx`) al destino local y renombrar antes de modificar.
