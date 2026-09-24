import { WordsService } from './words.service';

describe('WordsService', () => {
  const wordsRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const songsService = {
    findByFileName: jest.fn(),
  };
  let service: WordsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WordsService(wordsRepository as any, songsService as any);
  });

  describe('findBySongFile', () => {
    it('returns [] when the file does not match any song', async () => {
      songsService.findByFileName.mockResolvedValue(null);
      expect(await service.findBySongFile('missing.mp4')).toEqual([]);
      expect(wordsRepository.find).not.toHaveBeenCalled();
    });

    it('returns the words for the resolved song id', async () => {
      songsService.findByFileName.mockResolvedValue({ id: 1 });
      const words = [{ id: 1, spanish: 'noche', english: 'night', songId: 1 }];
      wordsRepository.find.mockResolvedValue(words);

      const result = await service.findBySongFile('StandByMe_BenEKing.mp4');

      expect(songsService.findByFileName).toHaveBeenCalledWith(
        'StandByMe_BenEKing.mp4',
      );
      expect(wordsRepository.find).toHaveBeenCalledWith({
        where: { songId: 1 },
      });
      expect(result).toEqual(words);
    });
  });

  describe('create', () => {
    it('creates and saves a word linked to its song and phrase', async () => {
      const created = { songId: 1, phraseId: 3, english: 'night', spanish: 'noche' };
      wordsRepository.create.mockReturnValue(created);
      wordsRepository.save.mockResolvedValue({ id: 99, ...created });

      const result = await service.create(1, 3, 'night', 'noche');

      expect(wordsRepository.create).toHaveBeenCalledWith({
        songId: 1,
        phraseId: 3,
        english: 'night',
        spanish: 'noche',
      });
      expect(wordsRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual({ id: 99, ...created });
    });
  });
});
