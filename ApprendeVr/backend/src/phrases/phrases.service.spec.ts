import { PhrasesService } from './phrases.service';

describe('PhrasesService', () => {
  const phrasesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const songsService = {
    findByFileName: jest.fn(),
  };
  let service: PhrasesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhrasesService(phrasesRepository as any, songsService as any);
  });

  describe('findBySongFile', () => {
    it('returns [] when the file does not match any song', async () => {
      songsService.findByFileName.mockResolvedValue(null);
      expect(await service.findBySongFile('missing.mp4')).toEqual([]);
      expect(phrasesRepository.find).not.toHaveBeenCalled();
    });

    it('returns the phrases for the resolved song id', async () => {
      songsService.findByFileName.mockResolvedValue({ id: 1 });
      const phrases = [
        { id: 1, spanish: 'Cuando la noche ha llegado', english: 'When the night has come', songId: 1 },
      ];
      phrasesRepository.find.mockResolvedValue(phrases);

      const result = await service.findBySongFile('StandByMe_BenEKing.mp4');

      expect(songsService.findByFileName).toHaveBeenCalledWith(
        'StandByMe_BenEKing.mp4',
      );
      expect(phrasesRepository.find).toHaveBeenCalledWith({
        where: { songId: 1 },
        order: { time: 'ASC', id: 'ASC' },
      });
      expect(result).toEqual(phrases);
    });
  });

  describe('updateTime', () => {
    it('updates the time of an existing phrase and saves it', async () => {
      const existing = { id: 1, spanish: 'Hola', english: 'Hello', songId: 1, time: '00:00:03' };
      phrasesRepository.findOne.mockResolvedValue(existing);
      phrasesRepository.save.mockImplementation(async (p) => p);

      const result = await service.updateTime(1, '00:00:05');

      expect(phrasesRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(existing.time).toBe('00:00:05');
      expect(phrasesRepository.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(existing);
    });

    it('returns null when the phrase does not exist', async () => {
      phrasesRepository.findOne.mockResolvedValue(null);

      expect(await service.updateTime(999, '00:00:05')).toBeNull();
      expect(phrasesRepository.save).not.toHaveBeenCalled();
    });
  });
});
