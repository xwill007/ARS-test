import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  const jwtService = { sign: jest.fn() };
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(usersService as any, jwtService as any);
  });

  describe('register', () => {
    it('creates the user with a hashed password and returns a token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const created = {
        id: 1,
        name: 'Ana',
        email: 'ana@test.com',
        password: 'hashed-password',
        level: '',
        date: new Date(),
      };
      usersService.create.mockResolvedValue(created);
      jwtService.sign.mockReturnValue('signed-token');

      const result = await authService.register({
        name: 'Ana',
        email: 'ANA@Test.com',
        password: 'secret123',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('ana@test.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Ana',
        email: 'ana@test.com',
        password: 'hashed-password',
        level: undefined,
      });
      expect(result).toEqual({
        access_token: 'signed-token',
        user: {
          id: 1,
          name: 'Ana',
          email: 'ana@test.com',
          level: '',
          date: created.date,
        },
      });
    });

    it('rejects registering an email that already exists', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'ana@test.com',
      });

      await expect(
        authService.register({
          name: 'Ana',
          email: 'ana@test.com',
          password: 'secret123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const existingUser = {
      id: 1,
      name: 'Ana',
      email: 'ana@test.com',
      password: 'hashed-password',
      level: '',
      date: new Date(),
    };

    it('returns a token when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('signed-token');

      const result = await authService.login({
        email: 'ana@test.com',
        password: 'secret123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'secret123',
        'hashed-password',
      );
      expect(result.access_token).toBe('signed-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'missing@test.com', password: 'secret123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'ana@test.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
