import { useRef, useState, useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'  // Importación necesaria

export default function Girl({ position = [0, 0, 0], scale = 0.01 }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/WarriorGirl.glb')
  const { actions, names } = useAnimations(animations, group)
  const [hovered, setHovered] = useState(false)
  
  // Iniciar animación al cargar
  useEffect(() => {
    if (actions && names.length > 0) {
      // Iniciar con la primera animación
      const action = actions[names[0]]
      if (action) {
        action.reset().fadeIn(0.5).play()
      }
    }
  }, [actions, names])
  
  // Cambiar animación cuando el usuario interactúa
  useEffect(() => {
    if (!actions || names.length === 0) return
    
    if (hovered) {
      // Buscar una animación de saludo o baile
      const danceNames = names.filter(name => 
        name.toLowerCase().includes('dance') || 
        name.toLowerCase().includes('wave')
      )
      
      const animName = danceNames.length > 0 ? 
        danceNames[0] : 
        names[Math.floor(Math.random() * names.length)]
      
      // Cambiar a la nueva animación con crossfade
      const current = actions[animName]
      
      Object.values(actions).forEach(action => {
        if (action !== current) {
          action.fadeOut(0.5)
        }
      })
      
      if (current) {
        current.reset().fadeIn(0.5).play()
      }
    } else {
      // Volver a la animación por defecto (idle)
      const idleNames = names.filter(name => 
        name.toLowerCase().includes('idle') || 
        name.toLowerCase().includes('stand')
      )
      
      const animName = idleNames.length > 0 ? 
        idleNames[0] : 
        names[0]
      
      const current = actions[animName]
      
      Object.values(actions).forEach(action => {
        if (action !== current) {
          action.fadeOut(0.5)
        }
      })
      
      if (current) {
        current.reset().fadeIn(0.5).play()
      }
    }
  }, [hovered, actions, names])
  
  return (
    <RigidBody 
      position={position}
      colliders="cuboid"
      type="fixed"
    >
      <group 
        ref={group} 
        dispose={null}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => {
          // Cambiar a una animación aleatoria al hacer clic
          if (actions && names.length > 0) {
            const randomIndex = Math.floor(Math.random() * names.length)
            const randomAnim = actions[names[randomIndex]]
            
            Object.values(actions).forEach(action => {
              if (action !== randomAnim) {
                action.fadeOut(0.5)
              }
            })
            
            if (randomAnim) {
              randomAnim.reset().fadeIn(0.5).play()
            }
          }
        }}
      >
        <primitive 
          object={scene.clone()} 
          scale={scale} // Ajustar según el tamaño del modelo
          rotation={[0, Math.PI, 0]} // Girar para que mire hacia el frente
        />
      </group>
    </RigidBody>
  )
}

// Precargar modelo
useGLTF.preload('/models/WarriorGirl.glb')