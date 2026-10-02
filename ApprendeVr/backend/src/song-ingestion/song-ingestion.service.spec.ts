import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongIngestionService } from './song-ingestion.service';
import { compareLyrics, buildComparisonRows, timeStringToSeconds } from './lyrics-comparison.util';
import { fetchLrclibLyrics } from './lrclib.util';
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
jest.mock('./lrclib.util', () => ({
  fetchLrclibLyrics: jest.fn(),
}));
jest.mock('./lyrics-comparison.util', () => ({
  compareLyrics: jest.fn(),
  buildComparisonRows: jest.fn(),
  timeStringToSeconds: jest.fn(),
}));

describe('SongIngestionService', () => {
  const songsService = {
    findByFileName: jest.fn(),
    markAsDownloaded: jest.fn(),
    markAsLocal: jest.fn(),
    create: jest.fn(),
  };
  const phrasesService = {
    create: jest.fn(),
    updateTime: jest.fn(),
    findBySongFile: jest.fn(),
  };
  const wordsService = {
    create: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const stagedPhrasesRepository = {
    delete: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };
  let service: SongIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SongIngestionService(
      songsService as any,
      phrasesService as any,
      wordsService as any,
      configService as any,
      stagedPhrasesRepository as any,
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
      expect(result).toEqual({ status: 'success', count: 2, words: 9, source: 'youtube' });
    });

    it('falls back to LRCLIB when YouTube has no captions', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([]);
      songsService.findByFileName.mockResolvedValue({
        id: 259,
        title: 'Always',
        author: 'Bon Jovi',
      });
      (fetchLrclibLyrics as jest.Mock).mockResolvedValue([
        { text: 'This Romeo is bleeding', startTime: 38.537 },
      ]);
      (translateText as jest.Mock).mockImplementation(async (_u, t) => {
        if (t === 'This Romeo is bleeding') return 'Este Romeo está sangrando';
        return 'TR_' + t;
      });
      (tokenizeWords as jest.Mock).mockImplementation(() => ['this', 'romeo']);
      (secondsToHms as jest.Mock).mockImplementation((s: number) => '00:00:38.5');
      phrasesService.create.mockResolvedValue({ id: 1, songId: 259 });
      wordsService.create.mockResolvedValue({});

      const result = await service.lyricsFromYoutube(dto as any);

      expect(fetchLrclibLyrics).toHaveBeenCalledWith('Bon Jovi', 'Always');
      expect(phrasesService.create).toHaveBeenCalledWith({
        archivo: dto.archivo,
        ingles_frase: 'This Romeo is bleeding',
        espanol_frase: 'Este Romeo está sangrando',
        tiempo_frase: '00:00:38.5',
      });
      expect(result).toEqual({ status: 'success', count: 1, words: 2, source: 'lrclib' });
    });

    it('throws BadRequestException when no captions were found', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([]);
      songsService.findByFileName.mockResolvedValue(null);

      await expect(service.lyricsFromYoutube(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchLrclibLyrics).not.toHaveBeenCalled();
      expect(phrasesService.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when captions are empty and LRCLIB has no lyrics', async () => {
      (fetchYoutubePhrases as jest.Mock).mockResolvedValue([]);
      songsService.findByFileName.mockResolvedValue({
        id: 259,
        title: 'Always',
        author: 'Bon Jovi',
      });
      (fetchLrclibLyrics as jest.Mock).mockResolvedValue([]);

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
      expect(songsService.markAsDownloaded).toHaveBeenCalledWith(259, 'Always-Bon-Jovi.mp4', dto.youtubeUrl);
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
        { title: 'Always', author: 'Bon Jovi', fileName: 'Always-Bon-Jovi.mp4', source: ['youtube', 'server'], url: dto.youtubeUrl },
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

  describe('downloadVideoToDevice', () => {
    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      title: 'Always',
      author: 'Bon Jovi',
      archivo: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    };

    it('downloads to a temp path and marks the existing song as local', async () => {
      (slugifyFileName as jest.Mock).mockReturnValue('Always-Bon-Jovi.mp4');
      (downloadYoutubeVideo as jest.Mock).mockResolvedValue(undefined);
      songsService.findByFileName.mockResolvedValue({ id: 259, title: 'Always', author: 'Bon Jovi', fileName: dto.archivo });
      songsService.markAsLocal.mockResolvedValue({ id: 259, fileName: 'Always-Bon-Jovi.mp4', source: 'local' });

      const result = await service.downloadVideoToDevice({ youtubeUrl: dto.youtubeUrl, archivo: dto.archivo } as any, 31);

      expect(slugifyFileName).toHaveBeenCalledWith('Always', 'Bon Jovi');
      // Descarga a un archivo temporal (no a videos/karaoke).
      expect(downloadYoutubeVideo).toHaveBeenCalledWith(
        dto.youtubeUrl,
        expect.stringContaining('Always-Bon-Jovi.mp4'),
      );
      expect(songsService.markAsLocal).toHaveBeenCalledWith(259, 'Always-Bon-Jovi.mp4', dto.youtubeUrl);
      expect(songsService.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        fileName: 'Always-Bon-Jovi.mp4',
        filePath: expect.any(String),
        song: expect.any(Object),
        created: false,
      });
    });

    it('creates a new "local" song when archivo does not match', async () => {
      (slugifyFileName as jest.Mock).mockReturnValue('Always-Bon-Jovi.mp4');
      (downloadYoutubeVideo as jest.Mock).mockResolvedValue(undefined);
      songsService.findByFileName.mockResolvedValue(null);
      songsService.create.mockResolvedValue({ id: 1, fileName: 'Always-Bon-Jovi.mp4', source: 'local' });

      const result = await service.downloadVideoToDevice({ ...dto, archivo: undefined } as any, 31);

      expect(songsService.create).toHaveBeenCalledWith(
        { title: 'Always', author: 'Bon Jovi', fileName: 'Always-Bon-Jovi.mp4', source: ['youtube', 'local'], url: dto.youtubeUrl },
        31,
      );
      expect(result).toEqual({
        fileName: 'Always-Bon-Jovi.mp4',
        filePath: expect.any(String),
        song: expect.any(Object),
        created: true,
      });
    });

    it('throws BadRequestException when neither archivo matches nor title is provided', async () => {
      songsService.findByFileName.mockResolvedValue(null);

      await expect(
        service.downloadVideoToDevice({ youtubeUrl: dto.youtubeUrl } as any, 31),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(downloadYoutubeVideo).not.toHaveBeenCalled();
    });
  });

  describe('fetchLyricsFromLrclib', () => {
    const dto = { archivo: 'Its-My-Life-Bon-Jovi.mp4' };
    const song = { id: 259, title: "It's My Life", author: 'Bon Jovi' };

    beforeEach(() => {
      songsService.findByFileName.mockResolvedValue(song);
      stagedPhrasesRepository.delete.mockResolvedValue(undefined);
      stagedPhrasesRepository.create.mockImplementation((x: any) => x);
      stagedPhrasesRepository.save.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      (secondsToHms as jest.Mock).mockImplementation((s: number) => {
        const whole = Math.floor(s);
        const tenth = Math.round((s - whole) * 10);
        return '00:00:' + String(whole).padStart(2, '0') + '.' + tenth;
      });
      (compareLyrics as jest.Mock).mockReturnValue({
        assignments: [{ phraseId: 1, english: 'A', newTime: '00:00:38.5' }],
        mismatches: [{ text: 'B', startTime: 43.1 }],
      });
      (buildComparisonRows as jest.Mock).mockReturnValue([
        { newText: 'A', newTime: '00:00:38.5', matched: true, currentText: 'A', currentTime: '00:00:00.0' },
        { newText: 'B', newTime: '00:00:43.1', matched: false, currentText: '', currentTime: null },
      ]);
    });

    it('fetches from LRCLIB, stages, and returns the comparison', async () => {
      (fetchLrclibLyrics as jest.Mock).mockResolvedValue([
        { text: 'A', startTime: 38.5 },
        { text: 'B', startTime: 43.1 },
      ]);

      const result = await service.fetchLyricsFromLrclib(dto as any);

      expect(fetchLrclibLyrics).toHaveBeenCalledWith('Bon Jovi', "It's My Life");
      expect(stagedPhrasesRepository.delete).toHaveBeenCalledWith({ songId: 259 });
      expect(stagedPhrasesRepository.save).toHaveBeenCalledWith([
        { songId: 259, english: 'A', time: '00:00:38.5' },
        { songId: 259, english: 'B', time: '00:00:43.1' },
      ]);
      expect(result).toEqual({
        status: 'success',
        stagedCount: 2,
        comparison: {
          assignments: [{ phraseId: 1, english: 'A', newTime: '00:00:38.5' }],
          mismatches: [{ text: 'B', startTime: 43.1 }],
        },
        rows: [
          { newText: 'A', newTime: '00:00:38.5', matched: true, currentText: 'A', currentTime: '00:00:00.0' },
          { newText: 'B', newTime: '00:00:43.1', matched: false, currentText: '', currentTime: null },
        ],
      });
    });

    it('throws NotFoundException when the song does not exist', async () => {
      songsService.findByFileName.mockResolvedValue(null);

      await expect(service.fetchLyricsFromLrclib(dto as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(fetchLrclibLyrics).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when LRCLIB has no lyrics', async () => {
      (fetchLrclibLyrics as jest.Mock).mockResolvedValue([]);

      await expect(service.fetchLyricsFromLrclib(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(stagedPhrasesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('applyLyricsSync', () => {
    const dto = { archivo: 'Its-My-Life-Bon-Jovi.mp4' };
    const song = { id: 259 };

    beforeEach(() => {
      songsService.findByFileName.mockResolvedValue(song);
      stagedPhrasesRepository.find.mockResolvedValue([
        { id: 1, english: 'A', time: '00:00:38.5' },
      ]);
      (timeStringToSeconds as jest.Mock).mockImplementation((t: string) => 38.5);
      stagedPhrasesRepository.delete.mockResolvedValue(undefined);
    });

    it('applies zero-time assignments and skips mismatches when not accepted', async () => {
      (compareLyrics as jest.Mock).mockReturnValue({
        assignments: [{ phraseId: 1, english: 'A', newTime: '00:00:38.5' }],
        mismatches: [{ text: 'B', startTime: 43.1 }],
      });
      phrasesService.updateTime.mockResolvedValue({ id: 1 });

      const result = await service.applyLyricsSync({ ...dto, acceptMismatches: false } as any);

      expect(phrasesService.updateTime).toHaveBeenCalledWith(1, '00:00:38.5');
      expect(phrasesService.create).not.toHaveBeenCalled();
      expect(stagedPhrasesRepository.delete).toHaveBeenCalledWith({ songId: 259 });
      expect(result).toEqual({
        status: 'success',
        appliedTimes: 1,
        insertedPhrases: 0,
        skippedMismatches: 1,
      });
    });

    it('translates and inserts mismatches when accepted', async () => {
      (compareLyrics as jest.Mock).mockReturnValue({
        assignments: [],
        mismatches: [{ text: 'B', startTime: 43.1 }],
      });
      (configService.get as jest.Mock).mockImplementation((key: string) =>
        key === 'libreTranslateUrl' ? 'http://localhost:5001' : undefined,
      );
      (translateText as jest.Mock).mockResolvedValue('Traducida');
      (secondsToHms as jest.Mock).mockImplementation((s: number) => '00:00:43.1');
      phrasesService.create.mockResolvedValue({ id: 10 });

      const result = await service.applyLyricsSync({ ...dto, acceptMismatches: true } as any);

      expect(phrasesService.create).toHaveBeenCalledWith({
        archivo: dto.archivo,
        ingles_frase: 'B',
        espanol_frase: 'Traducida',
        tiempo_frase: '00:00:43.1',
      });
      expect(result).toEqual({
        status: 'success',
        appliedTimes: 0,
        insertedPhrases: 1,
        skippedMismatches: 0,
      });
    });

    it('throws BadRequestException when there is no staging', async () => {
      stagedPhrasesRepository.find.mockResolvedValue([]);

      await expect(service.applyLyricsSync(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
