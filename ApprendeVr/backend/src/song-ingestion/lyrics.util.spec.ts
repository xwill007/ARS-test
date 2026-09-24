import { tokenizeWords } from './lyrics.util';

describe('lyrics.util', () => {
  describe('tokenizeWords', () => {
    it('tokenizes a phrase into lowercase unique words', () => {
      expect(tokenizeWords('When the night has come')).toEqual([
        'when',
        'the',
        'night',
        'has',
        'come',
      ]);
    });

    it('keeps contractions with apostrophes as a single word', () => {
      expect(tokenizeWords("I'll be there, can't stop")).toEqual([
        "i'll",
        'be',
        'there',
        "can't",
        'stop',
      ]);
    });

    it('strips music notes and punctuation', () => {
      expect(tokenizeWords('♪ Always ♪')).toEqual(['always']);
    });

    it('deduplicates repeated words within the same phrase', () => {
      expect(tokenizeWords('the the the')).toEqual(['the']);
    });

    it('returns [] for empty or punctuation-only input', () => {
      expect(tokenizeWords('')).toEqual([]);
      expect(tokenizeWords('!!! ...')).toEqual([]);
    });
  });
});
