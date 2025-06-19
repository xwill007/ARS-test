import { useState, useRef, useEffect } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

function VRTextTranslation({ 
  textKey = 'greeting',
  language1 = 'L1',
  language2 = 'L2',
  position = [0, 1.5, -3],
  scale = 1
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [translations, setTranslations] = useState({})
  const groupRef = useRef()
  const rotationRef = useRef(0)

  // Load translations dynamically
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const [lang1Data, lang2Data] = await Promise.all([
          import(`../locales/${language1}.json`),
          import(`../locales/${language2}.json`)
        ]);

        setTranslations({
          [language1]: lang1Data.default.translation,
          [language2]: lang2Data.default.translation
        });
      } catch (error) {
        console.error('Error loading translations:', error);
      }
    };

    loadTranslations();
  }, [language1, language2]);

  useFrame(() => {
    if (isFlipped) {
      rotationRef.current += (Math.PI - rotationRef.current) * 0.1
    } else {
      rotationRef.current += (0 - rotationRef.current) * 0.1
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationRef.current
    }
  })

  const handleClick = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      onClick={handleClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <mesh>
        <boxGeometry args={[3, 1, 0.1]} />
        <meshStandardMaterial 
          color={isHovered ? '#2196f3' : '#1976d2'}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Front text */}
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
      >
        {translations[language1]?.[textKey] || 'Loading...'}
      </Text>

      {/* Back text (rotated 180 degrees) */}
      <Text
        position={[0, 0, -0.06]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
      >
        {translations[language2]?.[textKey] || 'Loading...'}
      </Text>
    </group>
  )
}

export default VRTextTranslation