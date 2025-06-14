import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

function VRYoutubePlayer({
  position = [2.5, 3, -3.0],
  width = 6, // Increased width
  aspectRatio = 16/9,
  videoId = 'uVFw1Et8NFM'
}) {
  const { isPresenting } = useXR()
  const height = width / aspectRatio
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const playerContainerRef = useRef(null)
  const playerInstanceRef = useRef(null)

  useEffect(() => {
    // Load YouTube API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    // Initialize player when API is ready
    window.onYouTubeIframeAPIReady = () => {
      if (!playerContainerRef.current) return

      playerInstanceRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin
        },
        events: {
          onReady: (event) => {
            setIsReady(true)
            playerInstanceRef.current = event.target;
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING)
          },
          onError: (error) => {
            console.error('YouTube Player Error:', error)
          }
        }
      })
    }

    // Initialize if API is already loaded
    if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady()
    }

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy()
      }
    }
  }, [videoId])

  const handlePlayPause = () => {
    if (!playerInstanceRef.current || !isReady) return

    try {
      if (isPlaying) {
        playerInstanceRef.current.pauseVideo()
      } else {
        playerInstanceRef.current.playVideo()
      }
    } catch (err) {
      console.error('Play/Pause Error:', err)
    }
  }

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="black" side={THREE.DoubleSide} />
        <Html
          transform
          occlude
          distanceFactor={1}
          position={[0, 0, 0.001]}
          style={{
            width: `${width * 150}px`, // Increased size
            height: `${height * 150}px`, // Increased size
            transform: 'scale(1.2)', // Added scale
            transformOrigin: 'center'
          }}
        >
          <div
            ref={playerContainerRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#000'
            }}
          />
        </Html>
      </mesh>

      <Html position={[0, -height/2 - 0.3, 0]}>
        <button
          onClick={handlePlayPause}
          disabled={!isReady}
          style={{
            padding: '15px 30px', // Larger button
            fontSize: '20px', // Larger text
            backgroundColor: isPlaying ? '#ff4444' : '#44ff44',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isReady ? 'pointer' : 'default',
            opacity: isReady ? 1 : 0.5,
            transform: 'scale(1.2)' // Larger button scale
          }}
        >
          {!isReady ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
        </button>
      </Html>
    </group>
  )
}

export default VRYoutubePlayer