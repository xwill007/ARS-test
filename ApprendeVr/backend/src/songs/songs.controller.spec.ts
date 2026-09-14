import { SongsController } from './songs.controller';

describe('SongsController', () => {
  const songsService = {
    findAll: jest.fn(),
    create: jest.fn(),
  };
  let controller: SongsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SongsController(songsService as any);
  });

  describe('findAll', () => {
    it('delegates to SongsService.findAll', async () => {
      const songs = [{ id: 1 }, { id: 2 }];
      songsService.findAll.mockResolvedValue(songs);

      const result = await controller.findAll();

      expect(songsService.findAll).toHaveBeenCalledWith();
      expect(result).toBe(songs);
    });
  });

  describe('create', () => {
    it('delegates to SongsService.create with the validated DTO', async () => {
      const dto = { title: 'Stand By Me', fileName: 'a.mp4' } as any;
      const created = { id: 1, ...dto };
      songsService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(songsService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });
});
