import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = { register: jest.fn(), login: jest.fn() };
  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any);
  });

  it('delegates register to AuthService', async () => {
    const dto = { name: 'A', email: 'a@b.com', password: 'secret123' };
    authService.register.mockResolvedValue({
      access_token: 't',
      user: { id: 1 },
    });

    const result = await controller.register(dto as any);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 't', user: { id: 1 } });
  });

  it('delegates login to AuthService', async () => {
    const dto = { email: 'a@b.com', password: 'secret123' };
    authService.login.mockResolvedValue({ access_token: 't', user: { id: 1 } });

    const result = await controller.login(dto as any);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 't', user: { id: 1 } });
  });
});
