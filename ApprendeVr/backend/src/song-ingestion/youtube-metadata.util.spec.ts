import { cleanYoutubeTitle, parseYoutubeMetadata } from './youtube-metadata.util';

describe('youtube-metadata.util', () => {
  describe('cleanYoutubeTitle', () => {
    it('strips the "Artist - Title" prefix', () => {
      expect(cleanYoutubeTitle('Bon Jovi - Always (Official Music Video)', 'Bon Jovi'))
        .toBe('Always (Official Music Video)');
    });

    it('handles en/em dashes and colon separators', () => {
      expect(cleanYoutubeTitle('Bon Jovi – Always', 'Bon Jovi')).toBe('Always');
      expect(cleanYoutubeTitle('Bon Jovi — Always', 'Bon Jovi')).toBe('Always');
      expect(cleanYoutubeTitle('Bon Jovi: Always', 'Bon Jovi')).toBe('Always');
    });

    it('is case-insensitive on the author', () => {
      expect(cleanYoutubeTitle('bon jovi - Always', 'Bon Jovi')).toBe('Always');
    });

    it('leaves the title untouched when the author is not a prefix', () => {
      expect(cleanYoutubeTitle('Always - Bon Jovi', 'Bon Jovi')).toBe('Always - Bon Jovi');
      expect(cleanYoutubeTitle('Always (Official Music Video)', 'Bon Jovi'))
        .toBe('Always (Official Music Video)');
    });

    it('does nothing when author is empty', () => {
      expect(cleanYoutubeTitle('Some - Title', '')).toBe('Some - Title');
    });
  });

  describe('parseYoutubeMetadata', () => {
    it('parses title and author from a music video with artist metadata', () => {
      const raw = JSON.stringify({
        title: 'Bon Jovi - Always (Official Music Video)',
        artist: 'Bon Jovi',
        uploader: 'BonJoviVEVO',
        channel: 'BonJoviVEVO',
      });
      expect(parseYoutubeMetadata(raw)).toEqual({
        title: 'Always (Official Music Video)',
        author: 'Bon Jovi',
      });
    });

    it('falls back to uploader/channel when there is no artist/creator', () => {
      const raw = JSON.stringify({
        title: 'Some Video',
        uploader: 'Some Channel',
        channel: 'Some Channel',
      });
      expect(parseYoutubeMetadata(raw)).toEqual({
        title: 'Some Video',
        author: 'Some Channel',
      });
    });

    it('returns null when the JSON is invalid', () => {
      expect(parseYoutubeMetadata('not-json')).toBeNull();
    });

    it('returns null when there is no title', () => {
      const raw = JSON.stringify({ uploader: 'No Title Channel' });
      expect(parseYoutubeMetadata(raw)).toBeNull();
    });

    it('returns empty author when no artist/creator/uploader/channel present', () => {
      const raw = JSON.stringify({ title: 'Only Title' });
      expect(parseYoutubeMetadata(raw)).toEqual({
        title: 'Only Title',
        author: '',
      });
    });
  });
});
