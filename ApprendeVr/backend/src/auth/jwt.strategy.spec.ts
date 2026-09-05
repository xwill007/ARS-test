import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = { get: jest.fn().mockReturnValue('test-secret') };
  const usersService = { findById: jest.fn() };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('test-secret');
    strategy = new JwtStrategy(configService as any, usersService as any);
  });

  it('validates by loading the user referenced by the payload sub', async () => {
    usersService.findById.mockResolvedValue({ id: 5, email: 'a@b.com' });

    const result = await strategy.validate({ sub: 5, email: 'a@b.com' });

    expect(usersService.findById).toHaveBeenCalledWith(5);
    expect(result).toEqual({ id: 5, email: 'a@b.com' });
  });

  it('resolves to null (→ 401 vía @nestjs/passport) when the user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    const result = await strategy.validate({ sub: 999, email: 'gone@b.com' });

    expect(result).toBeNull();
  });
});
