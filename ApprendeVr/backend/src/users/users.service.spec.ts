import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(usersRepository as any);
  });

  describe('findByEmail', () => {
    it('queries by email', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 1, email: 'a@b.com' });
      const result = await service.findByEmail('a@b.com');
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
      expect(result).toEqual({ id: 1, email: 'a@b.com' });
    });

    it('returns null when not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      expect(await service.findByEmail('missing@b.com')).toBeNull();
    });
  });

  describe('findById', () => {
    it('queries by id', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 7 });
      const result = await service.findById(7);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(result).toEqual({ id: 7 });
    });
  });

  describe('create', () => {
    it('creates, saves, and reloads the user (to pick up DB defaults like `date`)', async () => {
      const created = {
        id: 9,
        name: 'A',
        email: 'a@b.com',
        password: 'hash',
        level: '',
      };
      usersRepository.create.mockReturnValue(created);
      usersRepository.save.mockResolvedValue(created);
      const reloaded = { ...created, date: new Date('2024-01-01') };
      usersRepository.findOne.mockResolvedValue(reloaded);

      const result = await service.create({
        name: 'A',
        email: 'a@b.com',
        password: 'hash',
      });

      expect(usersRepository.create).toHaveBeenCalledWith({
        level: '',
        name: 'A',
        email: 'a@b.com',
        password: 'hash',
      });
      expect(usersRepository.save).toHaveBeenCalledWith(created);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 9 },
      });
      expect(result).toEqual(reloaded);
    });

    it('falls back to the saved entity if the reload finds nothing (edge case)', async () => {
      const created = {
        id: 9,
        name: 'A',
        email: 'a@b.com',
        password: 'hash',
        level: '',
      };
      usersRepository.create.mockReturnValue(created);
      usersRepository.save.mockResolvedValue(created);
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.create({
        name: 'A',
        email: 'a@b.com',
        password: 'hash',
      });
      expect(result).toEqual(created);
    });
  });
});
