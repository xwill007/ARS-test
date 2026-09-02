import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh, RingGeometry } from 'three';

const DWELL_SECONDS = 3;

const VRCursorArs = ({ userPosition, pointerColor = '#2196f3', pointerScale = 0.05, enabled = true }) => {
  const { scene, camera } = useThree();
  const pointer = useRef(null);
  const progressRing = useRef(null);
  const raycaster = useRef(new Raycaster());
  const dwell = useRef({ object: null, startTime: 0, done: false });

  useEffect(() => {
    if (!enabled) return;

    // Cursor 3D (reticle en el punto apuntado)
    const geometry = new SphereGeometry(pointerScale, 16, 16);
    const material = new MeshBasicMaterial({
      color: pointerColor,
      transparent: true,
      opacity: 0.8
    });
    pointer.current = new Mesh(geometry, material);
    pointer.current.raycast = () => {}; // no debe autointersectarse con el propio raycaster
    scene.add(pointer.current);

    // Anillo de cuenta regresiva: se dibuja alrededor del reticle y se va cerrando
    // (encogiendo) mientras el usuario mantiene la mirada sobre un objeto interactivo.
    const ringGeometry = new RingGeometry(pointerScale * 2.2, pointerScale * 3, 32);
    const ringMaterial = new MeshBasicMaterial({
      color: pointerColor,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });
    progressRing.current = new Mesh(ringGeometry, ringMaterial);
    progressRing.current.raycast = () => {};
    progressRing.current.visible = false;
    scene.add(progressRing.current);

    return () => {
      if (pointer.current) {
        scene.remove(pointer.current);
        pointer.current = null;
      }
      if (progressRing.current) {
        scene.remove(progressRing.current);
        progressRing.current = null;
      }
    };
  }, [scene, pointerColor, pointerScale, enabled]);

  useFrame((state) => {
    if (!enabled || !pointer.current) return;

    // Actualizar color del cursor
    pointer.current.material.color.set(pointerColor);

    // Raycast desde la cámara (el usuario) hacia el centro de la pantalla
    raycaster.current.setFromCamera(new Vector3(0, 0, 0), camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    let targetPoint;
    let interactiveHit = null;
    if (intersects.length > 0) {
      targetPoint = intersects[0].point;
      pointer.current.position.copy(targetPoint);

      if (intersects[0].object.userData.interactive) {
        interactiveHit = intersects[0].object;
        pointer.current.material.opacity = 1.0;
      } else {
        pointer.current.material.opacity = 0.6;
      }
    } else {
      // Posicionar cursor a distancia fija frente a la cámara
      const pointerDistance = 3;
      const vector = new Vector3(0, 0, -pointerDistance);
      vector.applyQuaternion(camera.quaternion);
      targetPoint = camera.position.clone().add(vector);
      pointer.current.position.copy(targetPoint);
      pointer.current.material.opacity = 0.4;
    }

    // Temporizador de permanencia (dwell): si se mantiene la mira 3s sobre el mismo
    // objeto interactivo, se activa su click automáticamente (gaze-to-click).
    const ring = progressRing.current;
    if (interactiveHit) {
      if (dwell.current.object !== interactiveHit) {
        dwell.current = { object: interactiveHit, startTime: state.clock.elapsedTime, done: false };
      }

      const elapsed = state.clock.elapsedTime - dwell.current.startTime;
      const progress = Math.min(1, elapsed / DWELL_SECONDS);

      if (ring) {
        ring.visible = true;
        ring.position.copy(targetPoint);
        ring.quaternion.copy(camera.quaternion); // billboard: siempre mirando al usuario
        const shrink = 2.5 - progress * 1.5; // el anillo se va cerrando hacia el reticle
        ring.scale.setScalar(shrink);
        ring.material.color.set(pointerColor);
      }

      if (progress >= 1 && !dwell.current.done) {
        dwell.current.done = true; // evita disparos repetidos mientras se sigue mirando
        if (typeof interactiveHit.userData.onClick === 'function') {
          interactiveHit.userData.onClick({ object: interactiveHit, point: targetPoint });
        }
      }
    } else {
      dwell.current = { object: null, startTime: 0, done: false };
      if (ring) ring.visible = false;
    }
  });

  // Nota: no se monta VRClickArs aquí a propósito. Su listener de 'click' disparaba
  // userData.onClick de forma inmediata al primer click/tap, compitiendo con el
  // temporizador de permanencia de arriba (que debe ser la única forma de activar
  // un objeto interactive). El único disparador de userData.onClick es el dwell.
  return null;
};

export default VRCursorArs;
