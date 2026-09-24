import { BadRequestException } from '@nestjs/common';
import { SongIngestionService } from './song-ingestion.service';
import { fetchYoutubePhrases, secondsToHms } from './youtube-captions.util';
import {
  downloadYoutubeVideo,
  karaokeVideosDir,
  slugifyFileName,
} from './youtube-video.util';

jest.mock('./youtube-captions.util', () => ({
  fetchYoutubePhrases: jest.fn(),
  secondsToHms: jest.fn(),
}));
jest.mock('./youtube-video.util', () => ({
  downloadYoutubeVideo: jest.fn(),
  karaokeVideosDir: jest.fn(),
  slugifyFileName: jest.fn(),
}));

describe('SongIngestionService', () => {
  const songsService = {
    findByFileName: jest.fn(),
    markAsDownloaded: jest.fn(),
    create: jest.fn(),
  };
  const phrasesService = {
    create: jest.fn(),
  };
  let service: SongIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SongIngestionService(songsService as any, phrasesService as any);
  });

  describe('lyricsFromYoutube', () => {
    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      archivo: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    };

    it('creates one phrase per caption with its start time', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([
        { text: 'Always', startTime: 89.04 },
        { text: "And I'll be there forever and a day", startTime: 91.7 },
      ]);
      (secondsToHms as jest.Mock).mockImplementation((s: number) => '00:0' + Math.floor(s / 10) + ':' + (s % 10).toFixed(0));
      phrasesService.create.mockResolvedValue({ id: 1 });

      const result = await service.lyricsFromYoutube(dto as any);

      expect(phrasesService.create).toHaveBeenCalledTimes(2);
      expect(phrasesService.create).toHaveBeenNthCalledWith(1, {
        archivo: dto.archivo,
        ingles_frase: 'Always',
        espanol_frase: 'Always',
        tiempo_frase: expect.any(String),
      });
      expect(result).toEqual({ status: 'success', count: 2 });
    });

    it('throws BadRequestException when no captions were found', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([]);

      await expect(service.lyricsFromYoutube(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(phrasesService.create).not.toHaveBeenCalled();
    });
  });

  describe('downloadVideo', () => {
    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      title: 'Always',
      author: 'Bon Jovi',
      archivo: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    };

    it('downloads and reuses the existing song (deriving title/author from it) when archivo matches', async () => {
      (slugifyFileName as jest.Mock).mockReturnValue('Always-Bon-Jovi.mp4');
      (downloadYoutubeVideo as jest.Mock).mockResolvedValue(undefined);
      (karaokeVideosDir as jest.Mock).mockReturnValue('/videos');
      songsService.findByFileName.mockResolvedValue({ id: 259, title: 'Always', author: 'Bon Jovi', fileName: dto.archivo });
      songsService.markAsDownloaded.mockResolvedValue({ id: 259, fileName: 'Always-Bon-Jovi.mp4', source: 'server' });

      const result = await service.downloadVideo({ youtubeUrl: dto.youtubeUrl, archivo: dto.archivo } as any, 31);

      expect(slugifyFileName).toHaveBeenCalledWith('Always', 'Bon Jovi');
      expect(downloadYoutubeVideo).toHaveBeenCalledWith(
        dto.youtubeUrl,
        '/videos/Always-Bon-Jovi.mp4',
      );
      expect(songsService.markAsDownloaded).toHaveBeenCalledWith(259, 'Always-Bon-Jovi.mp4');
      expect(songsService.create).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'success', song: expect.any(Object), fileName: 'Always-Bon-Jovi.mp4', created: false });
    });

    it('creates a new "server" song when archivo does not match', async () => {
      (slugifyFileName as jest.Mock).mockReturnValue('Always-Bon-Jovi.mp4');
      (downloadYoutubeVideo as jest.Mock).mockResolvedValue(undefined);
      (karaokeVideosDir as jest.Mock).mockReturnValue('/videos');
      songsService.findByFileName.mockResolvedValue(null);
      songsService.create.mockResolvedValue({ id: 1, fileName: 'Always-Bon-Jovi.mp4', source: 'server' });

      const result = await service.downloadVideo({ ...dto, archivo: undefined } as any, 31);

      expect(songsService.create).toHaveBeenCalledWith(
        { title: 'Always', author: 'Bon Jovi', fileName: 'Always-Bon-Jovi.mp4', source: 'server' },
        31,
      );
      expect(result).toEqual({ status: 'success', song: expect.any(Object), fileName: 'Always-Bon-Jovi.mp4', created: true });
    });

    it('throws BadRequestException when neither archivo matches nor title is provided', async () => {
      songsService.findByFileName.mockResolvedValue(null);

      await expect(
        service.downloadVideo({ youtubeUrl: dto.youtubeUrl } as any, 31),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(downloadYoutubeVideo).not.toHaveBeenCalled();
    });
  });
});
