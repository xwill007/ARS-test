import { normalizeYoutubeSearchResults } from './youtube-search.util';

describe('youtube-search.util', () => {
  describe('normalizeYoutubeSearchResults', () => {
    it('normalizes a valid raw API response to the domain shape', () => {
      const raw = {
        items: [
          {
            id: { kind: 'youtube#video', videoId: 'abc123' },
            snippet: {
              title: 'Stand By Me',
              channelTitle: 'Ben E King',
              thumbnails: {
                default: { url: 'https://img/def.jpg' },
                medium: { url: 'https://img/med.jpg' },
                high: { url: 'https://img/high.jpg' },
              },
            },
          },
        ],
      };

      expect(normalizeYoutubeSearchResults(raw)).toEqual([
        {
          videoId: 'abc123',
          title: 'Stand By Me',
          thumbnailUrl: 'https://img/med.jpg',
          channelTitle: 'Ben E King',
        },
      ]);
    });

    it('normalizes an empty items array to []', () => {
      expect(normalizeYoutubeSearchResults({ items: [] })).toEqual([]);
    });

    it('returns [] for non-object input', () => {
      expect(normalizeYoutubeSearchResults(null)).toEqual([]);
      expect(normalizeYoutubeSearchResults('x')).toEqual([]);
      expect(normalizeYoutubeSearchResults(undefined)).toEqual([]);
    });

    it('returns [] when items is missing or not an array', () => {
      expect(normalizeYoutubeSearchResults({})).toEqual([]);
      expect(normalizeYoutubeSearchResults({ items: 'nope' })).toEqual([]);
    });

    it('skips items without a videoId', () => {
      const raw = {
        items: [
          { id: { kind: 'youtube#video' }, snippet: { title: 'Sin id' } },
          { id: { videoId: 'ok1' }, snippet: { title: 'Con id' } },
          { id: {}, snippet: { title: 'Sin videoId' } },
        ],
      };

      expect(normalizeYoutubeSearchResults(raw)).toEqual([
        { videoId: 'ok1', title: 'Con id', thumbnailUrl: '', channelTitle: '' },
      ]);
    });

    it('falls back to high then default thumbnail when medium is absent', () => {
      const raw = {
        items: [
          {
            id: { videoId: 'a' },
            snippet: {
              title: 'T',
              channelTitle: 'C',
              thumbnails: { default: { url: 'https://img/def.jpg' } },
            },
          },
        ],
      };
      expect(normalizeYoutubeSearchResults(raw)[0].thumbnailUrl).toBe('https://img/def.jpg');
    });

    it('returns empty strings for missing snippet fields', () => {
      const raw = { items: [{ id: { videoId: 'a' } }] };
      expect(normalizeYoutubeSearchResults(raw)).toEqual([
        { videoId: 'a', title: '', thumbnailUrl: '', channelTitle: '' },
      ]);
    });
  });
});
