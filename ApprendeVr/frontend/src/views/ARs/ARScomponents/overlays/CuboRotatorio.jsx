import React, { useRef, useEffect } from 'react';

/**
 * CuboRotatorio - Overlay de prueba con un cubo 3D que rota
 * Útil para verificar que los overlays se renderizan correctamente en ambos paneles
 */
const CuboRotatorio = ({ 
  size = 60, 
  position = { x: 0, y: 0 }, 
  speed = 0.3, 
  showLabel = true 
}) => {
  const cubeRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const animate = () => {
      if (cubeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) * 0.001; // segundos
        const rotation = elapsed * 60 * speed; // grados por segundo
        
        // Rotación en múltiples ejes para mejor efecto visual
        const rotateX = rotation;
        const rotateY = rotation * 1.5;
        const rotateZ = rotation * 0.5;
        
        cubeRef.current.style.transform = `
          translate(-50%, -50%) 
          rotateX(${rotateX}deg) 
          rotateY(${rotateY}deg) 
          rotateZ(${rotateZ}deg)
        `;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed]);

  return (
    <div 
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
        width: size,
        height: size,
        zIndex: 10,
        pointerEvents: 'none'
      }}
    >
      {/* Cubo 3D */}
      <div
        ref={cubeRef}
        style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Caras del cubo */}
        {[
          { name: 'front', transform: `translateZ(${size/2}px)`, bg: '#4CAF50' },
          { name: 'back', transform: `translateZ(-${size/2}px) rotateY(180deg)`, bg: '#FF5722' },
          { name: 'right', transform: `translateX(${size/2}px) rotateY(90deg)`, bg: '#2196F3' },
          { name: 'left', transform: `translateX(-${size/2}px) rotateY(-90deg)`, bg: '#FF9800' },
          { name: 'top', transform: `translateY(-${size/2}px) rotateX(90deg)`, bg: '#9C27B0' },
          { name: 'bottom', transform: `translateY(${size/2}px) rotateX(-90deg)`, bg: '#607D8B' }
        ].map((face, index) => (
          <div
            key={face.name}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              background: face.bg,
              border: '2px solid rgba(255,255,255,0.8)',
              transform: face.transform,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(12, size * 0.15),
              fontWeight: 'bold',
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              boxSizing: 'border-box'
            }}
          >
            {index + 1}
          </div>
        ))}
      </div>
      
      {/* Etiqueta opcional */}
      {showLabel && (
        <div style={{
          position: 'absolute',
          top: size + 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textAlign: 'center'
        }}>
          🔄 Cubo Test
        </div>
      )}
    </div>
  );
};

export default CuboRotatorio;
