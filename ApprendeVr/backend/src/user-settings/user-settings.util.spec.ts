import {
  columnForView,
  isKnownView,
  isValidAframeViewConfig,
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
    });

    it('rejects an unknown view', () => {
      expect(isKnownView('not-a-view')).toBe(false);
    });
  });

  describe('columnForView', () => {
    it('maps each view to its column', () => {
      expect(columnForView('login-form')).toBe('loginFormConfig');
      expect(columnForView('aframe-view')).toBe('aframeViewConfig');
      expect(columnForView('evaluation-panel')).toBe('evaluationPanelConfig');
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
