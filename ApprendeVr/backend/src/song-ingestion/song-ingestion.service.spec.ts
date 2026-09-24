import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongIngestionService } from './song-ingestion.service';
import { tokenizeWords } from './lyrics.util';
import { translateText } from './translation.util';
import { fetchYoutubePhrases, secondsToHms } from './youtube-captions.util';
import {
  downloadYoutubeVideo,
  karaokeVideosDir,
  slugifyFileName,
} from './youtube-video.util';

jest.mock('./lyrics.util', () => ({
  tokenizeWords: jest.fn(),
}));
jest.mock('./translation.util', () => ({
  translateText: jest.fn(),
}));
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
  const wordsService = {
    create: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  let service: SongIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SongIngestionService(
      songsService as any,
      phrasesService as any,
      wordsService as any,
      configService as any,
    );
  });

  describe('lyricsFromYoutube', () => {
    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      archivo: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    };

    beforeEach(() => {
      (configService.get as jest.Mock).mockImplementation((key: string) =>
        key === 'libreTranslateUrl' ? 'http://localhost:5000' : undefined,
      );
    });

    it('translates phrases and words, then creates one phrase and its words', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([
        { text: 'This Romeo is bleeding', startTime: 38.537 },
        { text: "And I'll be there forever", startTime: 91.715 },
      ]);
      (translateText as jest.Mock).mockImplementation(async (_u, t) => {
        if (t === 'This Romeo is bleeding') return 'Este Romeo está sangrando';
        if (t === "And I'll be there forever") return 'Y estaré allí para siempre';
        // palabras
        return 'TR_' + t;
      });
      (tokenizeWords as jest.Mock).mockImplementation((text: string) =>
        text === 'This Romeo is bleeding'
          ? ['this', 'romeo', 'is', 'bleeding']
          : ['and', "i'll", 'be', 'there', 'forever'],
      );
      (secondsToHms as jest.Mock).mockImplementation((s: number) => '00:00:' + Math.round(s));
      phrasesService.create.mockImplementation(async (p: any) => ({ id: p.ingles_frase === 'This Romeo is bleeding' ? 1 : 2, songId: 259, ...p }));
      wordsService.create.mockImplementation(async (songId, phraseId, en, es) => ({ songId, phraseId, english: en, spanish: es }));

      const result = await service.lyricsFromYoutube(dto as any);

      expect(phrasesService.create).toHaveBeenCalledTimes(2);
      expect(phrasesService.create).toHaveBeenNthCalledWith(1, {
        archivo: dto.archivo,
        ingles_frase: 'This Romeo is bleeding',
        espanol_frase: 'Este Romeo está sangrando',
        tiempo_frase: expect.any(String),
      });
      // 4 + 5 palabras creadas
      expect(wordsService.create).toHaveBeenCalledTimes(9);
      expect(wordsService.create).toHaveBeenCalledWith(259, 1, 'this', 'TR_this');
      expect(result).toEqual({ status: 'success', count: 2, words: 9 });
    });

    it('throws BadRequestException when no captions were found', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([]);

      await expect(service.lyricsFromYoutube(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(phrasesService.create).not.toHaveBeenCalled();
    });

    it('does not save anything when translation fails (all-or-nothing)', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([
        { text: 'This Romeo is bleeding', startTime: 38.537 },
      ]);
      (translateText as jest.Mock).mockRejectedValue(new Error('TRANSLATION_FAILED (500)'));

      await expect(service.lyricsFromYoutube(dto as any)).rejects.toThrow();
      expect(phrasesService.create).not.toHaveBeenCalled();
      expect(wordsService.create).not.toHaveBeenCalled();
    });

    it('throws when libreTranslateUrl is not configured', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([
        { text: 'This Romeo is bleeding', startTime: 38.537 },
      ]);
      (configService.get as jest.Mock).mockReturnValue(undefined);

      await expect(service.lyricsFromYoutube(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(translateText).not.toHaveBeenCalled();
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
