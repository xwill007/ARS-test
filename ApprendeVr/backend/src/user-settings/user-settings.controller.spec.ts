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

  it('delegates GET to the service with the user id and the requested view', () => {
    userSettingsService.getConfig.mockReturnValue({ position: [0, 1.6, 1] });

    const result = controller.getConfig('login-form', user);

    expect(userSettingsService.getConfig).toHaveBeenCalledWith(1, 'login-form');
    expect(result).toEqual({ position: [0, 1.6, 1] });
  });

  it('delegates PUT to the service with the user id, view and body config', () => {
    const config = { position: [0, 1.6, 1], distanceFactor: 2.7 };
    userSettingsService.saveConfig.mockReturnValue(config);

    const result = controller.saveConfig('login-form', { config }, user);

    expect(userSettingsService.saveConfig).toHaveBeenCalledWith(
      1,
      'login-form',
      config,
    );
    expect(result).toEqual(config);
  });
});
