import { UserSettingsController } from './user-settings.controller';

describe('UserSettingsController', () => {
  const userSettingsService = {
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
  };
  let controller: UserSettingsController;
  const user = { id: 1 } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserSettingsController(userSettingsService as any);
  });

  it('delegates GET to the service with the user id, view and device', () => {
    userSettingsService.getConfig.mockReturnValue({ position: [0, 1.6, 1] });

    const result = controller.getConfig('login-form', 'mobile', user);

    expect(userSettingsService.getConfig).toHaveBeenCalledWith(1, 'login-form', 'mobile');
    expect(result).toEqual({ position: [0, 1.6, 1] });
  });

  it('defaults GET device to "web" when the query param is missing', () => {
    userSettingsService.getConfig.mockReturnValue(null);

    controller.getConfig('login-form', undefined, user);

    expect(userSettingsService.getConfig).toHaveBeenCalledWith(1, 'login-form', 'web');
  });

  it('delegates PUT to the service with the user id, view, device and body config', () => {
    const config = { position: [0, 1.6, 1], distanceFactor: 2.7 };
    userSettingsService.saveConfig.mockReturnValue(config);

    const result = controller.saveConfig('login-form', 'mobile', { config }, user);

    expect(userSettingsService.saveConfig).toHaveBeenCalledWith(
      1,
      'login-form',
      config,
      'mobile',
    );
    expect(result).toEqual(config);
  });

  it('defaults PUT device to "web" when the query param is missing', () => {
    const config = { position: [0, 1.6, 1], distanceFactor: 2.7 };
    userSettingsService.saveConfig.mockReturnValue(config);

    controller.saveConfig('login-form', undefined, { config }, user);

    expect(userSettingsService.saveConfig).toHaveBeenCalledWith(1, 'login-form', config, 'web');
  });
});
