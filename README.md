# ARS-test — Realidad Aumentada Estereoscópica + VR

Plataforma educativa de Realidad Aumentada Estereoscópica (ARS) que combina **React Three Fiber**, **A-Frame** y **WebXR** para crear experiencias inmersivas multi-vista desde el navegador, accesibles desde PC y móvil en la red local.

## Inicio rápido

```bash
# 1. Menú interactivo (recomendado)
scripts\manage.bat

# 2. O inicio directo
scripts\start.bat

# 3. Para acceder desde el móvil (con HTTPS)
scripts\start-movile.bat
```

Una vez iniciado, abrí `https://localhost:3000/` o la IP local que muestra la consola.

---

## Vistas

| Vista | Ruta | Tecnología | Descripción |
|-------|------|-----------|-------------|
| **Principal** | `/` | R3F | Escena 3D con botones que navegan a las demás vistas. Incluye suelo, cielo, video, y un menú de control. |
| **Mobile** | `/src/views/mobile/mobile.html` | R3F + WebXR | Experiencia VR inmovil con `<XR>`, cámara en primera persona, reproductores de video y texto 3D traducido. |
| **A-Frame** | `/src/views/A-frame/index.html` | A-Frame | Escena VR independiente con cámara (1ra/3ra persona), WASD, video local/YouTube, y texto MSDF. |
| **AR Estéreo** | `/src/views/ARs/index.html` | R3F + cámara | Dos paneles lado a lado con la cámara trasera del dispositivo + overlays 3D superpuestos. Diseñado para cardboard/gafas VR. |
| **Domo aprendizaje** | Botón "Mostrar Domo" | A-Frame | 100 pares de palabras ES/EN en paneles 3D tipo flip-card con raycaster y persistencia en localStorage. |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 18, React Router 7 |
| 3D Engine | Three.js 0.153, @react-three/fiber 8.13, @react-three/drei |
| VR/XR | A-Frame, @react-three/xr 5.6 |
| Física | @react-three/rapier |
| Build | Vite 4.4 (multi-entry: main + mobile + aframe) |
| Idioma | i18next + VRLanguageContext (ES / EN / PT-BR) |
| HTTPS | OpenSSL + CA local auto-firmada |
| PWA | Service Worker registrado en main.jsx |

---

## HTTPS para móvil

El servidor usa HTTPS con un certificado auto-firmado para que los sensores (cámara, movimiento) funcionen en el móvil.

### 1ra vez en el móvil

1. Abrí `https://<IP-DEL-PC>:3000/` desde el celular
2. Aceptá la advertencia de certificado no seguro
3. Toca **"Instalar Certificado CA"** para descargar `ca.pem`
4. Instalalo desde Ajustes > Seguridad > Instalar certificado
5. Recargá la página — la conexión ya será de confianza

### Android

1. Copiá `ApprendeVr/frontend/ssl/ca.pem` al teléfono
2. Instalalo desde **Ajustes > Seguridad > Certificados > Instalar certificado CA**
3. Si no lo reconoce, renombrá a `ca.crt`

### iPhone

1. Copiá `ca.pem` al iPhone (AirDrop / iCloud)
2. Instalá el perfil desde Ajustes
3. Activá confianza total en **Ajustes > General > Información > Ajustes de confianza de certificados**

---

## Scripts

Todos en [`scripts/`](scripts/). Usá `scripts\manage.bat` para un menú interactivo.

| Script | Qué hace |
|--------|----------|
| `start.bat` | Inicia el servidor con detección automática de IP local |
| `start-movile.bat` | Inicia con HTTPS, genera CA local, ideal para móvil |
| `restart.bat` | Reinstala dependencias, regenera SSL y arranca |
| `stop.bat` | Detiene el servidor y libera puertos |
| `status.bat` | Muestra qué procesos están usando los puertos |
| `install.bat` | Valida Node.js/npm e instala dependencias |
| `kill-ports.bat` | Liberación forzada de puertos (emergencias) |

---

## Configuración (`.env`)

```properties
VITE_FRONT_IP=localhost
VITE_PORT=3000
VITE_HTTPS=true
VITE_USE_HTTPS=true
```

Variables disponibles en [`.env`](.env) y [`.env.example`](.env.example).

---

## Arquitectura

```
ARS-test/
├── scripts/               # Scripts de gestión
├── ApprendeVr/frontend/
│   ├── src/
│   │   ├── components/    # VRConfig, VRUser, VRViews, VRWorld
│   │   ├── views/         # mobile/, A-frame/, ARs/
│   │   ├── config/        # Config AR estéreo, temas
│   │   └── locales/       # en.json, es.json, br.json
│   ├── ssl/               # Certificados auto-firmados
│   └── vite.config.js     # Multi-entry build
├── ssl/                   # Fallback SSL
└── .env                   # Variables de entorno
```

El flujo de entrada es `App.jsx` (R3F), que presenta botones 3D para navegar a las vistas Mobile, A-Frame o AR Estéreo. El Domo de aprendizaje puede superponerse sobre cualquiera de ellas.

---

## Desarrollo (Frontend)

Ver [`ApprendeVr/frontend/README_FRONTEND.md`](ApprendeVr/frontend/README_FRONTEND.md) para comandos de desarrollo, estructura del frontend, y build.
