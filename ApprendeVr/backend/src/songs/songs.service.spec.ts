import { SongsService } from './songs.service';

describe('SongsService', () => {
  const songsRepository = {
    findOne: jest.fn(),
  };
  let service: SongsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SongsService(songsRepository as any);
  });

  describe('findByFileName', () => {
    it('queries by fileName', async () => {
      songsRepository.findOne.mockResolvedValue({ id: 1, fileName: 'a.mp4' });
      const result = await service.findByFileName('a.mp4');
      expect(songsRepository.findOne).toHaveBeenCalledWith({
        where: { fileName: 'a.mp4' },
      });
      expect(result).toEqual({ id: 1, fileName: 'a.mp4' });
    });

    it('returns null when not found', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      expect(await service.findByFileName('missing.mp4')).toBeNull();
    });
  });
});
