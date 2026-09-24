import { slugifyFileName } from './youtube-video.util';

describe('youtube-video.util', () => {
  describe('slugifyFileName', () => {
    it('joins title and author into a safe mp4 filename', () => {
      expect(slugifyFileName('Stand By Me', 'Ben E. King')).toBe(
        'Stand-By-Me-Ben-E-King.mp4',
      );
    });

    it('handles a title without author', () => {
      expect(slugifyFileName('Always')).toBe('Always.mp4');
    });

    it('strips accents and punctuation', () => {
      expect(slugifyFileName('Coração!', 'Anísio')).toBe('Coracao-Anisio.mp4');
    });

    it('falls back to "song.mp4" when the slug would be empty', () => {
      expect(slugifyFileName('!!!', '???')).toBe('song.mp4');
    });
  });
});
