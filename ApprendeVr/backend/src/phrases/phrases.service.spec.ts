import { PhrasesService } from './phrases.service';

describe('PhrasesService', () => {
  const phrasesRepository = {
    find: jest.fn(),
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
      });
      expect(result).toEqual(phrases);
    });
  });
});
