import { ConflictException } from '@nestjs/common';
import { SongsService } from './songs.service';

describe('SongsService', () => {
  const songsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
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

  describe('findAll', () => {
    it('returns all songs ordered by id ascending', async () => {
      const songs = [{ id: 1 }, { id: 2 }];
      songsRepository.find.mockResolvedValue(songs);
      const result = await service.findAll();
      expect(songsRepository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
      expect(result).toBe(songs);
    });
  });

  describe('create', () => {
    it('normalizes title/author, saves, and returns the created song', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      const created = { title: 'Stand By Me', author: 'Ben E King', fileName: 'a.mp4' };
      songsRepository.create.mockReturnValue(created);
      songsRepository.save.mockResolvedValue({ id: 1, ...created });

      const result = await service.create({
        title: '  Stand   By Me ',
        author: ' Ben E King ',
        fileName: 'a.mp4',
      } as any);

      expect(songsRepository.findOne).toHaveBeenCalledWith({
        where: { title: 'Stand By Me', author: 'Ben E King' },
      });
      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'a.mp4',
      });
      expect(songsRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual({ id: 1, ...created });
    });

    it('includes language in the entity only when the DTO provides it', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      songsRepository.create.mockReturnValue({});
      songsRepository.save.mockResolvedValue({});

      await service.create({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'a.mp4',
        language: 'ingles',
      } as any);

      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'a.mp4',
        language: 'ingles',
      });
    });

    it('defaults a missing author to an empty string', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      songsRepository.create.mockReturnValue({});
      songsRepository.save.mockResolvedValue({});

      await service.create({ title: 'Stand By Me', fileName: 'a.mp4' } as any);

      expect(songsRepository.findOne).toHaveBeenCalledWith({
        where: { title: 'Stand By Me', author: '' },
      });
    });

    it('throws ConflictException when a song with the same title+author exists', async () => {
      songsRepository.findOne.mockResolvedValue({ id: 1, title: 'Stand By Me', author: 'Ben E King' });

      await expect(
        service.create({ title: 'Stand By Me', author: 'Ben E King', fileName: 'a.mp4' } as any),
      ).rejects.toThrow(ConflictException);
      expect(songsRepository.save).not.toHaveBeenCalled();
    });
  });
});
