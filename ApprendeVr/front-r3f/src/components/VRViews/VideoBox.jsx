import { Html } from '@react-three/drei'
import { useXR } from '@react-three/xr'
import * as THREE from 'three'

function VideoBox({ 
  position = [0, 1.7, -4],
  width = 8,
  aspectRatio = 16/9
}) {
  const { isPresenting } = useXR()
  const height = width / aspectRatio

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
        <Html
          transform
          occlude
          center
          distanceFactor={1}
          position={[0, 0, 0.001]}
          style={{
            width: `${width * 100}px`,
            height: `${height * 100}px`,
            transform: isPresenting ? 'scale(1.0)' : 'scale(3.0)',
            transformOrigin: 'center',
            pointerEvents: 'auto'
          }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&controls=1&playsinline=1&origin=${window.location.origin}`}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              backgroundColor: '#000'
            }}
          />
        </Html>
      </mesh>
    </group>
  )
}

export default VideoBox