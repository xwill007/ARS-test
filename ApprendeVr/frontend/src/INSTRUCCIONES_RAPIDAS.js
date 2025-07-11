// INSTRUCCIONES SIMPLES PARA PROBAR

// 1. Importa el componente donde quieras usarlo:
import EjemploVideoEstereoscopico from './views/ARs/examples/EjemploVideoEstereoscopico';

// 2. Úsalo directamente en tu JSX:
function MiComponente() {
  return (
    <div>
      <h2>Prueba del Sistema Estereoscópico</h2>
      <EjemploVideoEstereoscopico />
    </div>
  );
}

// 3. O como modal/overlay:
function MiApp() {
  const [mostrarPrueba, setMostrarPrueba] = useState(false);
  
  return (
    <div>
      <button onClick={() => setMostrarPrueba(!mostrarPrueba)}>
        {mostrarPrueba ? 'Ocultar' : 'Mostrar'} Prueba Estereoscópica
      </button>
      
      {mostrarPrueba && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'white', 
          zIndex: 1000,
          overflow: 'auto'
        }}>
          <button 
            onClick={() => setMostrarPrueba(false)}
            style={{ position: 'absolute', top: '10px', right: '10px' }}
          >
            ✕ Cerrar
          </button>
          <EjemploVideoEstereoscopico />
        </div>
      )}
    </div>
  );
}

// NOTA: Asegúrate de que el video /videos/gangstas.mp4 exista en tu carpeta public/videos/
// Si no tienes ese video, cambia la ruta en EjemploVideoEstereoscopico.jsx por una que sí tengas
