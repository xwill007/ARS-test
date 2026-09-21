import {
  isKnownDeviceType,
  isKnownView,
  isValidAframeViewConfig,
  isValidArsSyncCompassPositionConfig,
  isValidArsSyncConfigConfig,
  isValidArsSyncCursorConfig,
  isValidArsSyncOverlaysConfig,
  isValidConfigForView,
  isValidEvaluationPanelConfig,
  isValidLoginFormConfig,
} from './user-settings.util';

describe('user-settings.util', () => {
  describe('isKnownView', () => {
    it('accepts known views', () => {
      expect(isKnownView('login-form')).toBe(true);
      expect(isKnownView('aframe-view')).toBe(true);
      expect(isKnownView('evaluation-panel')).toBe(true);
      expect(isKnownView('ars-sync-overlays')).toBe(true);
      expect(isKnownView('ars-sync-config')).toBe(true);
      expect(isKnownView('ars-sync-compass-position')).toBe(true);
      expect(isKnownView('ars-sync-cursor')).toBe(true);
    });

    it('rejects an unknown view', () => {
      expect(isKnownView('not-a-view')).toBe(false);
    });
  });

  describe('isKnownDeviceType', () => {
    it('accepts known device types', () => {
      expect(isKnownDeviceType('web')).toBe(true);
      expect(isKnownDeviceType('mobile')).toBe(true);
    });

    it('rejects an unknown device type', () => {
      expect(isKnownDeviceType('tablet')).toBe(false);
      expect(isKnownDeviceType('')).toBe(false);
    });
  });

  describe('isValidLoginFormConfig', () => {
    it('accepts a valid payload', () => {
      expect(
        isValidLoginFormConfig({ position: [0, 1.6, 1], distanceFactor: 2.7 }),
      ).toBe(true);
    });

    it('rejects a position with the wrong length', () => {
      expect(
        isValidLoginFormConfig({ position: [0, 1.6], distanceFactor: 2.7 }),
      ).toBe(false);
    });

    it('rejects a non-numeric position value', () => {
      expect(
        isValidLoginFormConfig({ position: [0, 'a', 1], distanceFactor: 2.7 }),
      ).toBe(false);
    });

    it('rejects a non-positive distanceFactor', () => {
      expect(
        isValidLoginFormConfig({ position: [0, 1.6, 1], distanceFactor: 0 }),
      ).toBe(false);
    });

    it('rejects a missing distanceFactor', () => {
      expect(isValidLoginFormConfig({ position: [0, 1.6, 1] })).toBe(false);
    });

    it('rejects a non-object payload', () => {
      expect(isValidLoginFormConfig(null)).toBe(false);
      expect(isValidLoginFormConfig('nope')).toBe(false);
    });
  });

  describe('isValidAframeViewConfig', () => {
    const valid = {
      karaoke: { position: [10, 2.5, 3] },
      songList: { position: [12, 6.15, -3] },
      newSong: { position: [0, 5, 0] },
    };

    it('accepts a valid payload with all three elements', () => {
      expect(isValidAframeViewConfig(valid)).toBe(true);
    });

    // Ninguna clave es individualmente obligatoria (ver comentario grande junto a
    // AFRAME_VIEW_ELEMENTS): cada página que edita esta vista solo manda los elementos que existe
    // en su propio DOM, y UserSettingsService.saveConfig hace un merge superficial, no un
    // reemplazo completo — así que un payload con un subconjunto es válido.
    it('accepts a payload missing one of the known elements (partial save from a page without it)', () => {
      const { newSong, ...rest } = valid;
      expect(isValidAframeViewConfig(rest)).toBe(true);
    });

    it('accepts a payload with only the youtubeVideo element (saved from youtube-video.html)', () => {
      expect(
        isValidAframeViewConfig({ youtubeVideo: { position: [0.5, 1.8, -2.5] } }),
      ).toBe(true);
    });

    it('accepts a payload that also includes a valid youtubeVideo', () => {
      expect(
        isValidAframeViewConfig({ ...valid, youtubeVideo: { position: [0.5, 1.8, -2.5] } }),
      ).toBe(true);
    });

    it('accepts a payload with only the songText element (saved from song-text.html)', () => {
      expect(
        isValidAframeViewConfig({ songText: { position: [0, 1.6, -3] } }),
      ).toBe(true);
    });

    it('accepts a payload with only the songTextEdit element (saved from song-text.html)', () => {
      expect(
        isValidAframeViewConfig({ songTextEdit: { position: [0, 1.0, -2.5] } }),
      ).toBe(true);
    });

    it('rejects an element without a valid position', () => {
      expect(
        isValidAframeViewConfig({ ...valid, karaoke: { position: [0, 6] } }),
      ).toBe(false);
    });

    it('rejects a youtubeVideo present but without a valid position', () => {
      expect(
        isValidAframeViewConfig({ ...valid, youtubeVideo: { position: [0, 1.8] } }),
      ).toBe(false);
    });

    it('rejects a payload with no known keys at all (empty object or garbage)', () => {
      expect(isValidAframeViewConfig({})).toBe(false);
      expect(isValidAframeViewConfig({ notAKnownKey: { position: [0, 0, 0] } })).toBe(false);
    });

    it('rejects a non-object payload', () => {
      expect(isValidAframeViewConfig(null)).toBe(false);
      expect(isValidAframeViewConfig('nope')).toBe(false);
    });
  });

  describe('isValidEvaluationPanelConfig', () => {
    it('accepts a valid position-only payload', () => {
      expect(isValidEvaluationPanelConfig({ position: [-2, 1.6, -1.5] })).toBe(
        true,
      );
    });

    it('rejects a payload without a valid position', () => {
      expect(isValidEvaluationPanelConfig({ position: [0, 1] })).toBe(false);
    });

    it('rejects a non-object payload', () => {
      expect(isValidEvaluationPanelConfig(null)).toBe(false);
      expect(isValidEvaluationPanelConfig('nope')).toBe(false);
    });
  });

  describe('isValidArsSyncOverlaysConfig', () => {
    it('accepts a valid list of known overlay keys', () => {
      expect(
        isValidArsSyncOverlaysConfig({ selectedOverlays: ['camera', 'video', 'karaoke'] }),
      ).toBe(true);
    });

    it('accepts an empty list', () => {
      expect(isValidArsSyncOverlaysConfig({ selectedOverlays: [] })).toBe(true);
    });

    it('rejects an unknown overlay key', () => {
      expect(
        isValidArsSyncOverlaysConfig({ selectedOverlays: ['camera', 'not-an-overlay'] }),
      ).toBe(false);
    });

    it('rejects a non-array selectedOverlays', () => {
      expect(isValidArsSyncOverlaysConfig({ selectedOverlays: 'video' })).toBe(false);
    });

    it('accepts youtubeVideo as a known overlay key', () => {
      expect(
        isValidArsSyncOverlaysConfig({ selectedOverlays: ['karaoke', 'youtubeVideo'] }),
      ).toBe(true);
    });

    it('accepts newSong as a known overlay key', () => {
      expect(
        isValidArsSyncOverlaysConfig({ selectedOverlays: ['karaoke', 'newSong'] }),
      ).toBe(true);
    });

    it('accepts songText as a known overlay key', () => {
      expect(
        isValidArsSyncOverlaysConfig({ selectedOverlays: ['karaoke', 'songText'] }),
      ).toBe(true);
    });

    it('rejects a non-object payload', () => {
      expect(isValidArsSyncOverlaysConfig(null)).toBe(false);
      expect(isValidArsSyncOverlaysConfig('nope')).toBe(false);
    });
  });

  describe('isValidArsSyncConfigConfig', () => {
    it('accepts a valid payload', () => {
      expect(
        isValidArsSyncConfigConfig({ separation: 24, panelWidth: 380, panelHeight: 480 }),
      ).toBe(true);
    });

    it('accepts zero as a valid separation', () => {
      expect(
        isValidArsSyncConfigConfig({ separation: 0, panelWidth: 380, panelHeight: 480 }),
      ).toBe(true);
    });

    it('rejects a negative value', () => {
      expect(
        isValidArsSyncConfigConfig({ separation: -1, panelWidth: 380, panelHeight: 480 }),
      ).toBe(false);
    });

    it('rejects a missing field', () => {
      expect(isValidArsSyncConfigConfig({ separation: 24, panelWidth: 380 })).toBe(false);
    });

    it('rejects a non-numeric field', () => {
      expect(
        isValidArsSyncConfigConfig({ separation: 24, panelWidth: '380', panelHeight: 480 }),
      ).toBe(false);
    });

    it('rejects a non-object payload', () => {
      expect(isValidArsSyncConfigConfig(null)).toBe(false);
      expect(isValidArsSyncConfigConfig('nope')).toBe(false);
    });
  });

  describe('isValidArsSyncCompassPositionConfig', () => {
    it('accepts a valid {x, y, z} payload', () => {
      expect(isValidArsSyncCompassPositionConfig({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(isValidArsSyncCompassPositionConfig({ x: -1.5, y: 2.25, z: 3 })).toBe(true);
    });

    it('rejects a missing coordinate', () => {
      expect(isValidArsSyncCompassPositionConfig({ x: 0, y: 0 })).toBe(false);
    });

    it('rejects a non-numeric coordinate', () => {
      expect(isValidArsSyncCompassPositionConfig({ x: 0, y: 'a', z: 0 })).toBe(false);
    });

    it('rejects a non-finite coordinate', () => {
      expect(isValidArsSyncCompassPositionConfig({ x: 0, y: Infinity, z: 0 })).toBe(false);
    });

    it('rejects a non-object payload', () => {
      expect(isValidArsSyncCompassPositionConfig(null)).toBe(false);
      expect(isValidArsSyncCompassPositionConfig('nope')).toBe(false);
    });
  });

  describe('isValidArsSyncCursorConfig', () => {
    const valid = {
      position: [0, 0, -1],
      scale: 1,
      fuseTimeout: 2500,
      color: '#ffffff',
      geometry: 'point',
      visible: true,
    };

    it('accepts a valid full payload', () => {
      expect(isValidArsSyncCursorConfig(valid)).toBe(true);
    });

    it('accepts every known geometry', () => {
      ['point', 'square', 'triangle', 'cross'].forEach((geometry) => {
        expect(isValidArsSyncCursorConfig({ ...valid, geometry })).toBe(true);
      });
    });

    it('rejects an unknown geometry', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, geometry: 'star' })).toBe(false);
    });

    it('rejects a non-positive scale', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, scale: 0 })).toBe(false);
      expect(isValidArsSyncCursorConfig({ ...valid, scale: -1 })).toBe(false);
    });

    it('rejects a non-positive fuseTimeout', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, fuseTimeout: 0 })).toBe(false);
    });

    it('rejects a non-string color', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, color: 5 })).toBe(false);
    });

    it('rejects an empty color', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, color: '' })).toBe(false);
    });

    it('rejects a non-boolean visible', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, visible: 'yes' })).toBe(false);
    });

    it('rejects an incomplete position tuple', () => {
      expect(isValidArsSyncCursorConfig({ ...valid, position: [0, 0] })).toBe(false);
    });

    it('rejects a non-object payload', () => {
      expect(isValidArsSyncCursorConfig(null)).toBe(false);
      expect(isValidArsSyncCursorConfig('nope')).toBe(false);
    });
  });

  describe('isValidConfigForView', () => {
    it('dispatches to the right validator per view', () => {
      expect(
        isValidConfigForView('login-form', { position: [0, 1.6, 1], distanceFactor: 2.7 }),
      ).toBe(true);
      expect(isValidConfigForView('aframe-view', { position: [0, 1.6, 1] })).toBe(
        false,
      );
    });
  });
});
