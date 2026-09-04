import { Canvas } from '@react-three/fiber'
import { VRButton, XR, Controllers, Hands } from '@react-three/xr'
import { Environment } from '@react-three/drei'
import VRCamera from './VRCamera'
import VRMoveControls from './VRMoveControls'
import { useVRLanguage } from '../VRConfig/VRLanguageContext'

const VRScene = () => {
  const { t } = useVRLanguage();
  return (
    <>
      <VRButton 
        className="vr-button" 
        enterOnly={true}
        title={t('buttons.enterVr')}
      />
      <Canvas>
        <XR>
          <Controllers />
          <Hands />
          <VRCamera />
          <VRMoveControls />
          <Environment preset="sunset" />
          {/* Your other scene components */}
        </XR>
      </Canvas>
    </>
  )
}

export default VRScene