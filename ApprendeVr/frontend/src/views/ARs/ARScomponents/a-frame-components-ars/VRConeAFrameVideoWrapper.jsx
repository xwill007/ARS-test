import React from 'react';
import VRConeAFrameVideoOverlay from './VRConeAFrameVideoOverlay';

const VRConeAFrameVideoWrapper = ({ targetPosition, lookAtTarget, ...props }) => {
  return (
    <VRConeAFrameVideoOverlay 
      {...props} 
      lookAtTarget={lookAtTarget}
      targetPosition={targetPosition}
    />
  );
};

export default VRConeAFrameVideoWrapper;
