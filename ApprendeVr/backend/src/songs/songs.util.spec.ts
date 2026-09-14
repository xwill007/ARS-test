import { buildDuplicateCriteria, normalizeSongText } from './songs.util';

describe('songs.util', () => {
  describe('normalizeSongText', () => {
    it('trims leading/trailing whitespace', () => {
      expect(normalizeSongText('  Stand By Me  ')).toBe('Stand By Me');
    });

    it('collapses internal repeated whitespace', () => {
      expect(normalizeSongText('Stand   By    Me')).toBe('Stand By Me');
    });

    it('returns an empty string for undefined', () => {
      expect(normalizeSongText(undefined)).toBe('');
    });

    it('returns an empty string for null', () => {
      expect(normalizeSongText(null)).toBe('');
    });

    it('returns an empty string for an empty string', () => {
      expect(normalizeSongText('')).toBe('');
    });
  });

  describe('buildDuplicateCriteria', () => {
    it('normalizes both title and author', () => {
      expect(buildDuplicateCriteria('  Stand   By Me ', ' Ben E King ')).toEqual({
        title: 'Stand By Me',
        author: 'Ben E King',
      });
    });

    it('normalizes a missing author to an empty string', () => {
      expect(buildDuplicateCriteria('Stand By Me', undefined)).toEqual({
        title: 'Stand By Me',
        author: '',
      });
    });
  });
});
