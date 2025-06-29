import React from 'react';
import VRConeOverlay from './VRConeOverlay';

const VRConeOverlayWrapper = ({ targetPosition, lookAtTarget, ...props }) => {
  return (
    <VRConeOverlay 
      {...props} 
      lookAtTarget={lookAtTarget}
    />
  );
};

export default VRConeOverlayWrapper;