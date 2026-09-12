import {
  isKnownDeviceType,
  isKnownView,
  isValidAframeViewConfig,
  isValidArsSyncConfigConfig,
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

    it('accepts a valid payload with both elements', () => {
      expect(isValidAframeViewConfig(valid)).toBe(true);
    });

    it('rejects a payload missing one element', () => {
      const { newSong, ...rest } = valid;
      expect(isValidAframeViewConfig(rest)).toBe(false);
    });

    it('rejects an element without a valid position', () => {
      expect(
        isValidAframeViewConfig({ ...valid, karaoke: { position: [0, 6] } }),
      ).toBe(false);
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
