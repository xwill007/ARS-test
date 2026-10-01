import {
  buildComparisonRows,
  compareLyrics,
  isZeroTime,
  normalizeLyricText,
  timeStringToSeconds,
} from './lyrics-comparison.util';

describe('lyrics-comparison.util', () => {
  describe('normalizeLyricText', () => {
    it('lowercases and strips punctuation', () => {
      expect(normalizeLyricText("It's My Life!")).toBe('it s my life');
    });

    it('removes accents and smart apostrophes', () => {
      expect(normalizeLyricText('Don’t Stop')).toBe('don t stop');
    });

    it('collapses whitespace and removes music notes', () => {
      expect(normalizeLyricText('  This   ♪  line  ')).toBe('this line');
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
  });
});
