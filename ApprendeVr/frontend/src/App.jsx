import React, { useState } from 'react';
import VRConfig from './components/VRConfig/VRConfig';
import VRWorld from './components/VRWorld/VRWorld';
import VRButton from './components/VRViews/VRButton';
import VRFloor from './components/VRWorld/VRFloor';
import VRDomo from './components/VRViews/VRDomo';
import StereoARView from './components/VRViews/VRViewARS/StereoARView';
import VRDisplay from './components/VRDisplay';
import LoginRegisterForm from './components/LoginRegisterForm';
import UbicacionControl from './components/UbicacionControl';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, Sky } from '@react-three/drei';
import { VRLanguageProvider, useVRLanguage } from './components/VRConfig/VRLanguageContext';
import { VRThemeProvider } from './components/VRConfig/VRThemeContext';
import { useRef, useState as useStateReact, useEffect } from 'react';

function App() {
  const [showVRDisplay, setShowVRDisplay] = useStateReact(true);
  return (
    <VRThemeProvider>
      <VRLanguageProvider>
        <div className="canvas-container">
          {/* UI y R3F */}
          <AppContent showVRDisplay={showVRDisplay} setShowVRDisplay={setShowVRDisplay} />
        </div>
      </VRLanguageProvider>
    </VRThemeProvider>
  );
}

function AppContent({ showVRDisplay, setShowVRDisplay }) {
  const { t, currentLang, setCurrentLang, isLoading } = useVRLanguage();
  const [showDomo, setShowDomo] = useState(false);
  const [showBoth, setShowBoth] = useState(false);
  const [showStereoAR, setShowStereoAR] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  // Zoom/posición del formulario 3D embebido (Requerimiento 007). Default definido: zoom 2.70,
  // posición [0, 1.6, 1]. Ajustables en caliente vía UbicacionControl (📍, esquina superior
  // izquierda del formulario) y persistidos por usuario (Requerimiento 010, vista `login-form`).
  const [authDistanceFactor, setAuthDistanceFactor] = useState(2.7);
  const [authPosition, setAuthPosition] = useState([0, 1.6, 1]);
  const moveStep = 0.1;

  const getStoredToken = () => {
    try {
      const auth = JSON.parse(localStorage.getItem('apprendevr_auth'));
      return auth?.access_token || null;
    } catch (e) {
      return null;
    }
  };

  // Sin sesión, ambas funciones son no-ops silenciosos: el ajuste de posición sigue funcionando
  // con estado local en memoria, sin intentar persistir nada (no hay de quién guardarlo).
  const getUserSetting = async (view) => {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/user-settings/${view}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  };

  const saveUserSetting = (view, config) => {
    const token = getStoredToken();
    if (!token) return;
    fetch(`/api/user-settings/${view}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ config }),
    }).catch(() => { /* el ajuste sigue funcionando en memoria aunque no se guarde */ });
  };

  // Al abrir el formulario, si hay sesión y el usuario ya había ajustado su posición antes,
  // reemplaza el default por lo guardado.
  useEffect(() => {
    if (!showAuth) return;
    let cancelled = false;
    getUserSetting('login-form').then((saved) => {
      if (cancelled || !saved) return;
      if (Array.isArray(saved.position) && typeof saved.distanceFactor === 'number') {
        setAuthPosition(saved.position);
        setAuthDistanceFactor(saved.distanceFactor);
      }
    });
    return () => { cancelled = true; };
  }, [showAuth]);

  const moveAuthPosition = (dx, dy) =>
    setAuthPosition(([x, y, z]) => {
      const next = [+(x + dx).toFixed(2), +(y + dy).toFixed(2), z];
      saveUserSetting('login-form', { position: next, distanceFactor: authDistanceFactor });
      return next;
    });

  const zoomAuthDistance = (delta) =>
    setAuthDistanceFactor((v) => {
      const next = Math.max(0.5, Math.min(5, +(v + delta).toFixed(2)));
      saveUserSetting('login-form', { position: authPosition, distanceFactor: next });
      return next;
    });

  // Cliente mínimo contra el backend de auth (Requerimiento 007, Fase 6). Se llama vía el proxy
  // de Vite (`/api` → `http://localhost:3001`, ver vite.config.js) en vez de una URL absoluta,
  // para no mezclar HTTPS (frontend) con HTTP (backend, sin TLS todavía) — mixed content.
  const postAuth = async (path, body) => {
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // AuthService devuelve `message` con un código estable (EMAIL_ALREADY_EXISTS,
      // INVALID_CREDENTIALS): LoginRegisterForm lo traduce vía auth.errors.*.
      throw new Error(data.message || 'serverError');
    }
    return data;
  };

  const submitRegister = async ({ name, email, password, age, englishLevel, nativeLanguage, targetLanguage }) => {
    // `age`/`nativeLanguage`/`targetLanguage` aún no tienen columna en `usuarios` (ver
    // problems_solutions.md de 007): el backend los descarta (ValidationPipe whitelist), se
    // envían igual para no requerir otro cambio de frontend cuando se agreguen.
    // No guarda token ni cierra el formulario: LoginRegisterForm pasa a modo login con el correo
    // ya cargado, y es ese login inmediato el que guarda la sesión (ver submitLogin).
    await postAuth('register', { name, email, password, level: englishLevel, age, nativeLanguage, targetLanguage });
  };

  const submitLogin = async ({ email, password }) => {
    const data = await postAuth('login', { email, password });
    localStorage.setItem('apprendevr_auth', JSON.stringify(data));
    // Al iniciar sesión (no al registrarse) se redirige a la vista A-Frame.
    window.location.href = aframeUrl;
  };
  const [arSeparation, setArSeparation] = useState(24); // px separación
  const [arWidth, setArWidth] = useState(380); // px ancho de cada vista
  const [arHeight, setArHeight] = useState(480); // px alto de cada vista
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  useEffect(() => {
    document.title = t('titles.main');
  }, [currentLang]);

  const protocol = import.meta.env.VITE_HTTPS === 'true' ? 'https' : 'http'
  const host = import.meta.env.VITE_FRONT_IP
  const port = import.meta.env.VITE_PORT
  const baseUrl = `${protocol}://${host}:${port}`
  const mobileUrl = `${baseUrl}/src/views/mobile/mobile.html`
  const aframeUrl = `${baseUrl}/src/views/A-frame/index.html`  // Corregido para usar la ruta real del archivo

  // Acceso a la cámara para AR
  useEffect(() => {
    if (!showStereoAR) return;
    let stream;
    // Pantalla completa al entrar en modo AR estéreo
    const enterFullscreen = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    };
    enterFullscreen();
    const getCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRefL.current) videoRefL.current.srcObject = stream;
        if (videoRefR.current) videoRefR.current.srcObject = stream;
      } catch (e) {
        console.error('No se pudo acceder a la cámara', e);
      }
    };
    getCamera();
    return () => {
      // Salir de pantalla completa al salir del modo AR estéreo
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showStereoAR]);

  return (
    <div className="canvas-container">

      {showVRDisplay && (
        <VRDisplay
          onShowDomo={() => { setShowDomo((v) => !v); setShowBoth(false); }}
          onShowBothViews={() => { setShowBoth((v) => !v); setShowDomo(false); }}
          onShowARStereo={() => { setShowStereoAR((v) => !v); setShowDomo(false); setShowBoth(false); }}
        />
      )}
      <VRConfig 
        showVRDisplay={showVRDisplay} 
        setShowVRDisplay={setShowVRDisplay} 
      />
      {(!showDomo || showBoth) && (
        <Canvas camera={{ position: [0, 2, 5] }}>
          {/* Look control de la vista inicial: permite girar la cámara (mirar alrededor) con
              click+arrastre, sin desplazarla (pan deshabilitado) ni alejarla/acercarla (zoom
              deshabilitado) — la cámara permanece en su posición fija ([0, 2, 5]).
              Ángulo vertical acotado entre minPolarAngle=60° (tope superior: no deja subir la
              cámara más allá de una vista a 60° desde arriba) y maxPolarAngle=90° (horizonte: con
              target en y=1 y radio ~5.1, la cámara nunca baja de y≈1, por lo que no llega a
              atravesar el suelo en y=0).
              Ángulo horizontal acotado a ±60° desde el frente (azimut inicial 0, cámara en el
              lado +Z): evita rotar lo suficiente como para ver de canto/atrás el formulario 3D
              embebido (que es un plano HTML orientado hacia +Z). */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={true}
            target={[0, 1, 0]}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2}
            minAzimuthAngle={-Math.PI / 3}
            maxAzimuthAngle={Math.PI / 3}
          />
          <Sky
            sunPosition={[100, 10, 100]}
            turbidity={0.1}
            rayleigh={0.5}
            mieCoefficient={0.003}
            mieDirectionalG={0.7}
          />
          <VRFloor 
            size={[200, 200]} // Piso más grande
            textureRepeat={[100, 100]} // Más repeticiones de textura
            roughness={0.6} // Diferente acabado
            metalness={0.3} // Diferente acabado
          />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <VRButton
            position={[-1, 2, 0]}
            scale={0.9}
            text={t('buttons.vrR3f')}
            navigateTo={mobileUrl}
          />
          <VRButton
            position={[1, 2, 0]}
            scale={0.9}
            text={t('buttons.aFrame')}
            navigateTo={aframeUrl}
          />
          <VRButton
            position={[0, 0.8, 0]}
            scale={0.9}
            text={t('buttons.arStereo')}
            navigateTo={baseUrl + '/src/views/ARs/index.html'}
          />
          {/* Temporal — Requerimiento 002: botón de prueba aislado del espejo de overlay en modo
              estéreo, ver ApprendeVr/Documentation/Requerimientos/2-Developing/002-*.md */}
          <VRButton
            position={[-2.4, 0.8, 0]}
            scale={0.9}
            text={t('buttons.arMirror')}
            navigateTo={baseUrl + '/src/views/ARs/ARScomponents/ARStest/mirror-fix/artest-mirror.html'}
          />
          <VRButton
            position={[0, 3.2, 0]}
            scale={0.9}
            text={t('buttons.login')}
            onClick={() => setShowAuth((v) => !v)}
          />
          {/* Requerimiento 007 — formulario 3D de login/registro embebido en la escena vía
              <Html> de drei. onSubmitRegister/onSubmitLogin llaman al backend real (submitRegister/
              submitLogin más arriba); guardan el token en localStorage pero sin AuthContext
              todavía (Fase 4: rehidratar sesión al montar, exponer useAuth(), etc.).
              <Html> monta su contenido en una raíz de React separada (ReactDOM.createRoot),
              no en un portal, así que no hereda VRLanguageProvider del árbol principal: hay
              que volver a proveerlo aquí (sincronizado con `currentLang` vía `key`+`defaultLang`)
              para que useVRLanguage()/t() funcione dentro de LoginRegisterForm.
              UbicacionControl (Requerimiento 007) queda disponible para reajustar en caliente el
              zoom/posición por defecto (2.70 / [0, 1.6, 1]) si hiciera falta más adelante. */}
          {showAuth && (
            <Html transform occlude position={authPosition} distanceFactor={authDistanceFactor}>
              <VRLanguageProvider key={currentLang} defaultLang={currentLang}>
                <div style={{ position: 'relative' }}>
                  <LoginRegisterForm
                    onSubmitRegister={submitRegister}
                    onSubmitLogin={submitLogin}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuth(false)}
                    aria-label="close-auth-form"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      zIndex: 21,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(0,0,0,0.65)',
                      color: 'white',
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                  <UbicacionControl
                    corner="top-left"
                    onZoomIn={() => zoomAuthDistance(0.1)}
                    onZoomOut={() => zoomAuthDistance(-0.1)}
                    onMoveUp={() => moveAuthPosition(0, moveStep)}
                    onMoveDown={() => moveAuthPosition(0, -moveStep)}
                    onMoveLeft={() => moveAuthPosition(-moveStep, 0)}
                    onMoveRight={() => moveAuthPosition(moveStep, 0)}
                    label={`${t('auth.zoomLabel')}: ${authDistanceFactor.toFixed(2)} · ${t('auth.positionLabel')}: [${authPosition.join(', ')}]`}
                  />
                </div>
              </VRLanguageProvider>
            </Html>
          )}
        </Canvas>
      )}
      {(showDomo || showBoth) && (
        <div id="aframe-container"
          style={showBoth ? {
            width: '100vw',
            height: '90vh',
            position: 'absolute',
            left: 0,
            bottom: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '0',
            overflow: 'hidden',
            boxShadow: '0 -4px 16px #0008',
            borderTop: '2px solid #333',
            pointerEvents: 'auto'
          } : {
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0, left: 0,
            zIndex: 2000,
            background: 'black',
            pointerEvents: 'auto'
          }}
        >
          <button
            style={{
              position: 'absolute',
              top: 16,
              right: 24,
              zIndex: 2100,
              background: '#222',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontSize: 16,
              cursor: 'pointer',
              opacity: 0.85
            }}
            onClick={() => { setShowDomo(false); setShowBoth(false); }}
          >
            {t('home.back')}
          </button>
          <a-scene embedded vr-mode-ui="enabled: true">
            <VRDomo />
          </a-scene>
        </div>
      )}
      {showStereoAR && (
        <StereoARView
          onClose={() => setShowStereoAR(false)}
          defaultSeparation={arSeparation}
          defaultWidth={arWidth}
          defaultHeight={arHeight}
          overlay={<VRDomo />}
        />
      )}
    </div>
  );
}

export default App;