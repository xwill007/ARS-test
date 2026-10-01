import {
  buildComparisonRows,
  compareLyrics,
  isZeroTime,
  normalizeLyricText,
  timeStringToSeconds,
  tokenizeForCompare,
} from './lyrics-comparison.util';

describe('lyrics-comparison.util', () => {
  describe('normalizeLyricText', () => {
    it('lowercases and strips punctuation', () => {
      expect(normalizeLyricText("It's My Life!")).toBe('its my life');
    });

    it('removes accents and smart apostrophes', () => {
      expect(normalizeLyricText('Don’t Stop')).toBe('dont stop');
    });

    it('joins hyphens (broken-hearted == brokenhearted)', () => {
      expect(normalizeLyricText('for the broken-hearted')).toBe('for the brokenhearted');
      expect(normalizeLyricText('For the brokenhearted.')).toBe('for the brokenhearted');
    });

    it('collapses whitespace and removes music notes', () => {
      expect(normalizeLyricText('  This   ♪  line  ')).toBe('this line');
    });
  });

  describe('tokenizeForCompare', () => {
    it('drops articles, conjunctions and interjections', () => {
      expect(tokenizeForCompare('No silent prayer for the faith-departed')).toEqual([
        'no',
        'silent',
        'prayer',
        'for',
        'faithdeparted',
      ]);
      expect(tokenizeForCompare('And I ain\'t gonna be just a face in the crowd')).toEqual([
        'i',
        'aint',
        'gonna',
        'be',
        'just',
        'face',
        'in',
        'crowd',
      ]);
    });
  });

  describe('timeStringToSeconds', () => {
    it('parses HH:MM:SS.d', () => {
      expect(timeStringToSeconds('00:00:38.5')).toBeCloseTo(38.5);
    });

    it('parses HH:MM:SS without fraction', () => {
      expect(timeStringToSeconds('00:01:00')).toBe(60);
    });

    it('returns NaN for invalid input', () => {
      expect(timeStringToSeconds('nope')).toBeNaN();
    });
  });

  describe('isZeroTime', () => {
    it('is true for zero, null or empty', () => {
      expect(isZeroTime('00:00:00.0')).toBe(true);
      expect(isZeroTime('00:00:00')).toBe(true);
      expect(isZeroTime(null)).toBe(true);
      expect(isZeroTime(undefined)).toBe(true);
    });

    it('is false for a real time', () => {
      expect(isZeroTime('00:00:38.5')).toBe(false);
    });
  });

  describe('compareLyrics', () => {
    const staged = [
      { text: 'This Romeo is bleeding', startTime: 38.5 },
      { text: "But you can't see his blood", startTime: 43.1 },
      { text: 'A brand new line', startTime: 50.0 },
    ];

    it('assigns times to zero-time phrases matched by text and lists the rest as mismatch', () => {
      const existing = [
        { id: 1, english: 'This Romeo is bleeding', time: '00:00:00.0' },
        { id: 2, english: 'Some other line', time: '00:00:00.0' },
      ];
      const result = compareLyrics(staged, existing);

      expect(result.assignments).toEqual([
        { phraseId: 1, english: 'This Romeo is bleeding', newTime: '00:00:38.5' },
      ]);
      expect(result.mismatches).toEqual([
        { text: "But you can't see his blood", startTime: 43.1 },
        { text: 'A brand new line', startTime: 50.0 },
      ]);
    });

    it('does not assign when the matched phrase already has a time (consumes the line)', () => {
      const existing = [
        { id: 1, english: 'This Romeo is bleeding', time: '00:00:38.5' },
      ];
      const result = compareLyrics(staged, existing);

      expect(result.assignments).toEqual([]);
      // La línea matcheada no debe aparecer como mismatch (ya está sincronizada).
      expect(result.mismatches).toEqual([
        { text: "But you can't see his blood", startTime: 43.1 },
        { text: 'A brand new line', startTime: 50.0 },
      ]);
    });

    it('returns empty assignments and all lines as mismatch when nothing matches', () => {
      const existing = [{ id: 1, english: 'Totally different', time: '00:00:00.0' }];
      const result = compareLyrics(staged, existing);

      expect(result.assignments).toEqual([]);
      expect(result.mismatches).toHaveLength(3);
    });

    it('handles empty inputs', () => {
      expect(compareLyrics([], [])).toEqual({ assignments: [], mismatches: [] });
      expect(compareLyrics(staged, [])).toEqual({
        assignments: [],
        mismatches: staged.map((s) => ({ text: s.text, startTime: s.startTime })),
      });
    });

    it('matches a LRCLIB line that equals the concatenation of 2 consecutive phrases', () => {
      const lines = [
        { text: 'This ain\'t a song for the broken-hearted', startTime: 8.35 },
        { text: 'No silent prayer', startTime: 16.04 },
      ];
      const phrases = [
        { id: 34, english: "This ain't a song", time: '00:00:00.0' },
        { id: 35, english: 'For the brokenhearted.', time: '00:00:00.0' },
        { id: 36, english: 'No silent prayer', time: '00:00:00.0' },
      ];
      const result = compareLyrics(lines, phrases);

      expect(result.assignments).toEqual([
        { phraseId: 34, english: "This ain't a song", newTime: '00:00:08.4' },
        { phraseId: 35, english: 'For the brokenhearted.', newTime: '00:00:08.4' },
        { phraseId: 36, english: 'No silent prayer', newTime: '00:00:16.0' },
      ]);
      expect(result.mismatches).toEqual([]);
    });

    it('matches when the existing phrases have an extra stopword ("the") vs LRCLIB', () => {
      const lines = [{ text: 'No silent prayer for faith-departed', startTime: 16.04 }];
      const phrases = [
        { id: 36, english: 'No silent prayer', time: '00:00:00.0' },
        { id: 37, english: 'For the faith-departed.', time: '00:00:00.0' },
      ];
      const result = compareLyrics(lines, phrases);

      expect(result.assignments).toEqual([
        { phraseId: 36, english: 'No silent prayer', newTime: '00:00:16.0' },
        { phraseId: 37, english: 'For the faith-departed.', newTime: '00:00:16.0' },
      ]);
      expect(result.mismatches).toEqual([]);
    });
  });

  describe('buildComparisonRows', () => {
    const staged = [
      { text: 'This Romeo is bleeding', startTime: 38.5 },
      { text: "But you can't see his blood", startTime: 43.1 },
    ];

    it('aligns matched and unmatched lines side by side', () => {
      const existing = [
        { id: 1, english: 'This Romeo is bleeding', time: '00:00:00.0' },
      ];
      const rows = buildComparisonRows(staged, existing);

      expect(rows).toEqual([
        {
          newText: 'This Romeo is bleeding',
          newTime: '00:00:38.5',
          matched: true,
          currentText: 'This Romeo is bleeding',
          currentTime: '00:00:00.0',
        },
        {
          newText: "But you can't see his blood",
          newTime: '00:00:43.1',
          matched: false,
          currentText: '',
          currentTime: null,
        },
      ]);
    });

    it('returns all lines as unmatched when nothing matches', () => {
      const rows = buildComparisonRows(staged, []);
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.matched === false)).toBe(true);
    });

    it('returns empty for empty staged', () => {
      expect(buildComparisonRows([], [{ id: 1, english: 'x', time: '00:00:00.0' }])).toEqual([]);
    });

    it('joins multiple consecutive phrases into the current text', () => {
      const lines = [{ text: "This ain't a song for the broken-hearted", startTime: 8.35 }];
      const phrases = [
        { id: 34, english: "This ain't a song", time: '00:00:08.0' },
        { id: 35, english: 'For the brokenhearted.', time: '00:00:09.0' },
      ];
      const rows = buildComparisonRows(lines, phrases);

      expect(rows).toEqual([
        {
          newText: "This ain't a song for the broken-hearted",
          newTime: '00:00:08.4',
          matched: true,
          currentText: "This ain't a song For the brokenhearted.",
          currentTime: '00:00:08.0',
        },
      ]);
    });
  });
});
