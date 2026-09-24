import {
  captionTextOrNull,
  cleanCaptionText,
  extractYoutubeVideoId,
  normalizeYoutubeUrl,
  parseVttTimestamp,
  parseVttToPhrases,
  secondsToHms,
} from './youtube-captions.util';

describe('youtube-captions.util', () => {
  describe('extractYoutubeVideoId', () => {
    it('extracts the id from a watch URL with extra params', () => {
      expect(
        extractYoutubeVideoId('https://www.youtube.com/watch?v=9BMwcO6_hyA&list=RDrO9jJpqwnSI&index=21'),
      ).toBe('9BMwcO6_hyA');
    });

    it('extracts the id from a youtu.be short URL', () => {
      expect(extractYoutubeVideoId('https://youtu.be/9BMwcO6_hyA')).toBe('9BMwcO6_hyA');
    });

    it('returns null for a non-YouTube URL', () => {
      expect(extractYoutubeVideoId('https://example.com/x')).toBeNull();
    });
  });

  describe('normalizeYoutubeUrl', () => {
    it('normalizes a watch URL to its canonical form, dropping playlist params', () => {
      expect(
        normalizeYoutubeUrl('https://www.youtube.com/watch?v=9BMwcO6_hyA&list=RDrO9jJpqwnSI&index=21'),
      ).toBe('https://www.youtube.com/watch?v=9BMwcO6_hyA');
    });

    it('returns null for an unrecognized URL', () => {
      expect(normalizeYoutubeUrl('not a url')).toBeNull();
    });
  });

  describe('parseVttTimestamp', () => {
    it('parses "00:00:01.440" to seconds', () => {
      expect(parseVttTimestamp('00:00:01.440')).toBeCloseTo(1.44);
    });

    it('parses a comma-separated milliseconds timestamp', () => {
      expect(parseVttTimestamp('00:01:02,500')).toBeCloseTo(62.5);
    });

    it('parses a timestamp without milliseconds', () => {
      expect(parseVttTimestamp('00:02:03')).toBe(123);
    });

    it('returns NaN for a malformed timestamp', () => {
      expect(Number.isNaN(parseVttTimestamp('not a time'))).toBe(true);
    });
  });

  describe('cleanCaptionText', () => {
    it('removes music notes and collapses whitespace', () => {
      expect(cleanCaptionText('♪ This Romeo\n is bleeding ♪')).toBe(
        'This Romeo is bleeding',
      );
    });
  });

  describe('captionTextOrNull', () => {
    it('returns cleaned text for a sung line', () => {
      expect(captionTextOrNull('♪ Always ♪')).toBe('Always');
    });

    it('returns null for a parenthesized sound effect', () => {
      expect(captionTextOrNull('(dog barking)')).toBeNull();
    });

    it('returns null for empty text', () => {
      expect(captionTextOrNull('   ')).toBeNull();
    });
  });

  describe('parseVttToPhrases', () => {
    const sampleVtt = [
      'WEBVTT',
      'Kind: captions',
      'Language: en',
      '',
      '00:00:01.440 --> 00:00:04.873',
      '(dog barking)',
      '(children squealing)',
      '',
      '00:00:38.537 --> 00:00:41.925',
      '♪ This Romeo is bleeding ♪',
      '',
      '00:00:41.925 --> 00:00:45.272',
      '♪ But you can\'t see his blood ♪',
      '',
      '00:01:11.507 --> 00:01:15.099',
      '♪ Well, I guess I\'m',
      'not that good anymore ♪',
    ].join('\n');

    it('parses cues to phrases with start times, skipping sound effects', () => {
      const result = parseVttToPhrases(sampleVtt);
      expect(result).toEqual([
        { text: 'This Romeo is bleeding', startTime: 38.537 },
        { text: "But you can't see his blood", startTime: 41.925 },
        { text: "Well, I guess I'm not that good anymore", startTime: 71.507 },
      ]);
    });

    it('returns [] for empty input', () => {
      expect(parseVttToPhrases('')).toEqual([]);
    });

    it('returns [] for a vtt with no cues', () => {
      expect(parseVttToPhrases('WEBVTT\n\n')).toEqual([]);
    });
  });

  describe('secondsToHms', () => {
    it('formats seconds to HH:MM:SS.d', () => {
      expect(secondsToHms(38.537)).toBe('00:00:38.5');
    });

    it('rounds to the nearest tenth', () => {
      expect(secondsToHms(1.96)).toBe('00:00:02.0');
    });

    it('clamps negative values to zero', () => {
      expect(secondsToHms(-5)).toBe('00:00:00.0');
    });
  });
});
