import { ConflictException } from '@nestjs/common';
import { Like } from 'typeorm';
import { SongsService } from './songs.service';

describe('SongsService', () => {
  const songsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  describe('markAsDownloaded', () => {
    it('sets fileName and adds "server" to source on an existing song and saves it', async () => {
      const existing = { id: 259, fileName: 'https://www.youtube.com/watch?v=9BMwcO6_hyA', source: 'youtube' };
      songsRepository.findOne.mockResolvedValue(existing);
      songsRepository.save.mockImplementation(async (s) => s);

      const result = await service.markAsDownloaded(259, 'Always-Bon-Jovi.mp4');

      expect(songsRepository.findOne).toHaveBeenCalledWith({ where: { id: 259 } });
      expect(existing.fileName).toBe('Always-Bon-Jovi.mp4');
      expect(existing.source).toBe('youtube,server');
      expect(songsRepository.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(existing);
    });

    it('preserves the origin url when provided', async () => {
      const existing = { id: 259, fileName: 'https://www.youtube.com/watch?v=9BMwcO6_hyA', source: 'youtube', url: null };
      songsRepository.findOne.mockResolvedValue(existing);
      songsRepository.save.mockImplementation(async (s) => s);

      await service.markAsDownloaded(259, 'Always-Bon-Jovi.mp4', 'https://www.youtube.com/watch?v=9BMwcO6_hyA');

      expect(existing.url).toBe('https://www.youtube.com/watch?v=9BMwcO6_hyA');
    });

    it('returns null when the song does not exist', async () => {
      songsRepository.findOne.mockResolvedValue(null);

      expect(await service.markAsDownloaded(999, 'x.mp4')).toBeNull();
      expect(songsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('markAsLocal', () => {
    it('sets fileName and adds "local" to source on an existing song and saves it', async () => {
      const existing = { id: 259, fileName: 'https://www.youtube.com/watch?v=9BMwcO6_hyA', source: 'youtube' };
      songsRepository.findOne.mockResolvedValue(existing);
      songsRepository.save.mockImplementation(async (s) => s);

      const result = await service.markAsLocal(259, 'Always-Bon-Jovi.mp4');

      expect(songsRepository.findOne).toHaveBeenCalledWith({ where: { id: 259 } });
      expect(existing.fileName).toBe('Always-Bon-Jovi.mp4');
      expect(existing.source).toBe('youtube,local');
      expect(songsRepository.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(existing);
    });

    it('preserves the origin url when provided', async () => {
      const existing = { id: 259, fileName: 'https://www.youtube.com/watch?v=9BMwcO6_hyA', source: 'youtube', url: null };
      songsRepository.findOne.mockResolvedValue(existing);
      songsRepository.save.mockImplementation(async (s) => s);

      await service.markAsLocal(259, 'Always-Bon-Jovi.mp4', 'https://www.youtube.com/watch?v=9BMwcO6_hyA');

      expect(existing.url).toBe('https://www.youtube.com/watch?v=9BMwcO6_hyA');
    });

    it('returns null when the song does not exist', async () => {
      songsRepository.findOne.mockResolvedValue(null);

      expect(await service.markAsLocal(999, 'x.mp4')).toBeNull();
      expect(songsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns songs whose source contains "server", ordered by id ascending', async () => {
      const songs = [{ id: 1 }, { id: 2 }];
      songsRepository.find.mockResolvedValue(songs);
      const result = await service.findAll();
      expect(songsRepository.find).toHaveBeenCalledWith({
        where: { source: Like('%server%') },
        order: { id: 'ASC' },
      });
      expect(result).toBe(songs);
    });
  });

  describe('findMine', () => {
    it('returns private songs (local/youtube, not server) scoped to the userId, ordered by id ascending', async () => {
      const songs = [{ id: 3, userId: 7, source: 'local' }, { id: 4, userId: 7, source: 'youtube' }];
      const queryBuilder = {
        where: jest.fn(),
        andWhere: jest.fn(),
        orderBy: jest.fn(),
        getMany: jest.fn(),
      };
      songsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.where.mockReturnValue(queryBuilder);
      queryBuilder.andWhere.mockReturnValue(queryBuilder);
      queryBuilder.orderBy.mockReturnValue(queryBuilder);
      queryBuilder.getMany.mockResolvedValue(songs);

      const result = await service.findMine(7);

      expect(songsRepository.createQueryBuilder).toHaveBeenCalledWith('song');
      expect(queryBuilder.where).toHaveBeenCalledWith('song.userId = :userId', { userId: 7 });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "(song.source LIKE '%local%' OR song.source LIKE '%youtube%')",
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith("song.source NOT LIKE '%server%'");
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('song.id', 'ASC');
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(result).toBe(songs);
    });
  });

  describe('create', () => {
    it('normalizes title/author, saves with the given userId, and returns the created song', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      const created = { title: 'Stand By Me', author: 'Ben E King', fileName: 'a.mp4', userId: 5 };
      songsRepository.create.mockReturnValue(created);
      songsRepository.save.mockResolvedValue({ id: 1, ...created });

      const result = await service.create({
        title: '  Stand   By Me ',
        author: ' Ben E King ',
        fileName: 'a.mp4',
      } as any, 5);

      expect(songsRepository.findOne).toHaveBeenCalledWith({
        where: { title: 'Stand By Me', author: 'Ben E King' },
      });
      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'a.mp4',
        userId: 5,
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
      } as any, 1);

      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'a.mp4',
        userId: 1,
        language: 'ingles',
      });
    });

    it('includes source in the entity only when the DTO provides it', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      songsRepository.create.mockReturnValue({});
      songsRepository.save.mockResolvedValue({});

      await service.create({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
        source: 'youtube',
      } as any, 1);

      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
        userId: 1,
        source: 'youtube',
      });
    });

    it('includes url in the entity only when the DTO provides it', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      songsRepository.create.mockReturnValue({});
      songsRepository.save.mockResolvedValue({});

      await service.create({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
        source: 'youtube',
        url: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
      } as any, 1);

      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Stand By Me',
        author: 'Ben E King',
        fileName: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
        userId: 1,
        source: 'youtube',
        url: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
      });
    });

    it('serializes a multi-source array into a comma-separated source and keeps it public when it contains "server"', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      songsRepository.create.mockReturnValue({});
      songsRepository.save.mockResolvedValue({});

      await service.create({
        title: 'Always',
        author: 'Bon Jovi',
        fileName: 'Always-Bon-Jovi.mp4',
        source: ['youtube', 'server'],
        url: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      } as any, 31);

      // Contiene 'server' → criterio de duplicado GLOBAL (sin userId).
      expect(songsRepository.findOne).toHaveBeenCalledWith({
        where: { title: 'Always', author: 'Bon Jovi' },
      });
      expect(songsRepository.create).toHaveBeenCalledWith({
        title: 'Always',
        author: 'Bon Jovi',
        fileName: 'Always-Bon-Jovi.mp4',
        userId: 31,
        source: 'youtube,server',
        url: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      });
    });

    it('defaults a missing author to an empty string', async () => {
      songsRepository.findOne.mockResolvedValue(null);
      songsRepository.create.mockReturnValue({});
      songsRepository.save.mockResolvedValue({});

      await service.create({ title: 'Stand By Me', fileName: 'a.mp4' } as any, 1);

      expect(songsRepository.findOne).toHaveBeenCalledWith({
        where: { title: 'Stand By Me', author: '' },
      });
    });

    it('throws ConflictException when a "server" song with the same title+author exists (global scope)', async () => {
      songsRepository.findOne.mockResolvedValue({ id: 1, title: 'Stand By Me', author: 'Ben E King' });

      await expect(
        service.create({ title: 'Stand By Me', author: 'Ben E King', fileName: 'a.mp4' } as any, 1),
      ).rejects.toThrow(ConflictException);
      expect(songsRepository.save).not.toHaveBeenCalled();
    });

    it.each(['local', 'youtube'])(
      'scopes the duplicate check by userId when source is "%s"',
      async (source) => {
        songsRepository.findOne.mockResolvedValue(null);
        songsRepository.create.mockReturnValue({});
        songsRepository.save.mockResolvedValue({});

        await service.create({
          title: 'My Song',
          author: '',
          fileName: 'my-song-ref',
          source,
        } as any, 9);

        expect(songsRepository.findOne).toHaveBeenCalledWith({
          where: { title: 'My Song', author: '', userId: 9 },
        });
      },
    );

    it.each(['local', 'youtube'])(
      'does not conflict two different users creating a "%s" song with the same title+author',
      async (source) => {
        // findOne scoped por userId: 9 no encuentra nada aunque exista una fila con userId 5.
        songsRepository.findOne.mockResolvedValue(null);
        songsRepository.create.mockReturnValue({});
        songsRepository.save.mockResolvedValue({});

        await expect(
          service.create({
            title: 'My Song',
            author: '',
            fileName: 'my-song-ref',
            source,
          } as any, 9),
        ).resolves.not.toThrow();
      },
    );
  });
});
