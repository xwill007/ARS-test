AFRAME.registerComponent('vr-floor', {
  schema: {
    width: { type: 'number', default: 100 },
    height: { type: 'number', default: 100 },
    textureRepeatX: { type: 'number', default: 50 },
    textureRepeatY: { type: 'number', default: 50 },
    roughness: { type: 'number', default: 0.8 },
    metalness: { type: 'number', default: 0.2 },
    src: { type: 'string', default: '/images/piso_ajedrez.jpg' }
  },

  init: function () {
    // Crear el plano
    const plane = document.createElement('a-plane');
    
    // Configurar atributos básicos
    plane.setAttribute('width', this.data.width);
    plane.setAttribute('height', this.data.height);
    plane.setAttribute('rotation', '-90 0 0');
    plane.setAttribute('shadow', 'receive: true');
    
    // Configurar el material y la textura
    plane.setAttribute('material', {
      src: this.data.src,
      roughness: this.data.roughness,
      metalness: this.data.metalness,
      repeat: `${this.data.textureRepeatX} ${this.data.textureRepeatY}`
    });

    // Añadir el plano como hijo del elemento
    this.el.appendChild(plane);

    // Configurar la repetición de la textura
    plane.addEventListener('materialtextureloaded', () => {
      const mesh = plane.getObject3D('mesh');
      if (mesh && mesh.material.map) {
        mesh.material.map.wrapS = THREE.RepeatWrapping;
        mesh.material.map.wrapT = THREE.RepeatWrapping;
        mesh.material.map.repeat.set(
          this.data.textureRepeatX,
          this.data.textureRepeatY
        );
        mesh.material.needsUpdate = true;
      }
    });
  }
});
