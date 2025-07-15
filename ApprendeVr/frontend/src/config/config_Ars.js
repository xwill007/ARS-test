// Configuración base para AR estereoscópico - Las configuraciones de usuario se guardan en localStorage
const configArs = {
  "version": "1.0.0",
  "description": "Configuración base para AR estereoscópico - Las configuraciones de usuario se guardan en localStorage",
  "deviceProfiles": {
    "mobile": {
      "arSeparation": 24,
      "arWidth": 320,
      "arHeight": 400,
      "offsetL": -5,
      "offsetR": 5,
      "zoom": 1.1
    },
    "tablet": {
      "arSeparation": 35,
      "arWidth": 400,
      "arHeight": 500,
      "offsetL": -8,
      "offsetR": 8,
      "zoom": 1.15
    },
    "desktop": {
      "arSeparation": 50,
      "arWidth": 450,
      "arHeight": 550,
      "offsetL": -12,
      "offsetR": 12,
      "zoom": 1.2
    }
  },
  "userConfig": {
    "arSeparation": 24,
    "arWidth": 380,
    "arHeight": 480,
    "offsetL": 0,
    "offsetR": 0,
    "zoom": 1.0,
    "deviceType": "auto",
    "customProfile": false
  },
  "presets": {
    "mobile": {
      "arSeparation": 24,
      "arWidth": 380,
      "arHeight": 480,
      "offsetL": 0,
      "offsetR": 0,
      "zoom": 1.0
    },
    "desktop": {
      "arSeparation": 40,
      "arWidth": 450,
      "arHeight": 550,
      "offsetL": -10,
      "offsetR": 10,
      "zoom": 1.2
    },
    "vr": {
      "arSeparation": 60,
      "arWidth": 300,
      "arHeight": 400,
      "offsetL": -20,
      "offsetR": 20,
      "zoom": 1.5
    }
  },
  "overlays": {
    "vrConeR3FVideoOverlay": {
      "mainVideo": {
        "position": [0, 5, 0],
        "scale": [5, 4, 1],
        "videoSrc": "/videos/sample.mp4",
        "showBackground": false,
        "quality": "720"
      },
      "secondaryVideo": {
        "position": [6, 5, 0],
        "scale": [3, 2, 1],
        "videoSrc": "https://youtu.be/dQw4w9WgXcQ",
        "showBackground": true,
        "quality": "720"
      },
      "labels": {
        "radiusBase": 8,
        "height": 10,
        "yOffset": -2
      },
      "centerMarker": {
        "position": [0, 0, 0],
        "visible": true,
        "color": "#00ff88"
      }
    },
    "vrConeOverlay": {
      "position": [0, 0, 0],
      "radiusBase": 6,
      "height": 6,
      "showUserMarker": true
    },
    "vrConeR3FOverlay": {
      "position": [0, 1, -3],
      "radiusBase": 4,
      "height": 6,
      "color": "#ff8800",
      "visible": true
    }
  }
};

export default configArs;
