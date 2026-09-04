import { useState, useRef, useEffect } from 'react'
import { Text } from '@react-three/drei'
import { RoundedBox } from '@react-three/drei'
import { useVRTheme } from '../VRConfig/VRThemeContext';

const TextLabel = ({ text, rotationY = 0 }) => {
  const { theme } = useVRTheme();
  const colors = theme?.colors || {};
  const fonts = theme?.fonts || {};
  return (
    <Text
      fontSize={0.25}
      color={colors.primary?.contrast || '#fff'}
      font={fonts.primary}
      anchorX="center"
      anchorY="middle"
      rotation-y={rotationY}
      outlineWidth={0.004}
      outlineColor="#000000"
      outlineBlur={0.001}
    >
      {text}
    </Text>
  );
}

function VRButton({
  position = [0, 1.5, -2],
  rotation = [0, 0, 0],
  scale = 0.5,
  text = "VR",
  navigateTo = null,
  // Si es false, el click directo del mouse/touch sobre el botón no hace nada: solo se
  // activa vía userData.onClick (p. ej. el raycaster de mirada con temporizador de VRCursorArs).
  instantClick = true
}) {
  const [hovered, setHovered] = useState(false)
  const { theme } = useVRTheme();
  const colors = theme?.colors || {};
  const fonts = theme?.fonts || {};
  const groupRef = useRef(null)

  const handleClick = () => {
    if (navigateTo) {
      window.location.href = navigateTo
    }
  }

  // Se marca como interactivo para el raycaster de mirada (VRCursorArs/VRClickArs), que
  // apunta desde el centro de la pantalla y dispara userData.onClick al hacer click/tap
  // en cualquier parte del canvas mientras el botón está bajo la mira. El raycaster lee
  // userData del mesh exacto que intersecta (caja o texto), no del group padre, así que
  // se marca cada descendiente.
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse((obj) => {
      obj.userData.interactive = true
      obj.userData.onClick = handleClick
    })
  }, [navigateTo])

  // Colores y fuente desde theme, con fallback seguro
  const primaryColor = colors.primary?.main || '#1976d2';
  const secondaryColor = colors.secondary?.main || '#2196f3';
  const emissiveColor = colors.primary?.main || '#1976d2';

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={instantClick ? handleClick : undefined}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <RoundedBox
        args={[2, 0.7, 0.1]}
        radius={0.05}
        smoothness={4}
      >
        <meshStandardMaterial
          color={hovered ? secondaryColor : primaryColor}
          metalness={0.1}
          roughness={0.2}
          emissive={hovered ? emissiveColor : '#000000'}
          emissiveIntensity={0.2}
        />
      </RoundedBox>
      <group position={[0, 0, 0.051]}><TextLabel text={text} /></group>
      <group position={[0, 0, -0.051]}><TextLabel text={text} rotationY={Math.PI} /></group>
    </group>
  )
}

export default VRButton