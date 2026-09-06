import { BadRequestException } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  const userSettingsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  let service: UserSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserSettingsService(userSettingsRepository as any);
  });

  describe('getConfig', () => {
    it('throws on an unknown view', async () => {
      await expect(service.getConfig(1, 'not-a-view')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userSettingsRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null when the user has no saved row', async () => {
      userSettingsRepository.findOne.mockResolvedValue(null);
      expect(await service.getConfig(1, 'login-form')).toBeNull();
    });

    it('returns null when the row exists but the column is empty', async () => {
      userSettingsRepository.findOne.mockResolvedValue({
        userId: 1,
        loginFormConfig: null,
      });
      expect(await service.getConfig(1, 'login-form')).toBeNull();
    });

    it('returns the saved config for the requested view', async () => {
      const config = { position: [0, 1.6, 1], distanceFactor: 2.7 };
      userSettingsRepository.findOne.mockResolvedValue({
        userId: 1,
        loginFormConfig: config,
      });
      expect(await service.getConfig(1, 'login-form')).toEqual(config);
      expect(userSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });
  });

  describe('saveConfig', () => {
    const validLoginForm = { position: [0, 1.6, 1], distanceFactor: 2.7 };

    it('throws on an unknown view', async () => {
      await expect(
        service.saveConfig(1, 'not-a-view', validLoginForm),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws on a config that does not match the shape of the view', async () => {
      await expect(
        service.saveConfig(1, 'login-form', { position: [0, 1] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('creates a new row when the user never saved anything before', async () => {
      userSettingsRepository.findOne.mockResolvedValue(null);
      const created = { userId: 1 };
      userSettingsRepository.create.mockReturnValue(created);
      userSettingsRepository.save.mockResolvedValue(created);

      const result = await service.saveConfig(1, 'login-form', validLoginForm);

      expect(userSettingsRepository.create).toHaveBeenCalledWith({ userId: 1 });
      expect(userSettingsRepository.save).toHaveBeenCalledWith({
        userId: 1,
        loginFormConfig: validLoginForm,
      });
      expect(result).toEqual(validLoginForm);
    });

    it('updates the existing row instead of creating a second one', async () => {
      const existing = {
        userId: 1,
        loginFormConfig: { position: [0, 0, 0], distanceFactor: 1 },
        aframeViewConfig: { some: 'other-view-data' },
      };
      userSettingsRepository.findOne.mockResolvedValue(existing);
      userSettingsRepository.save.mockResolvedValue(existing);

      await service.saveConfig(1, 'login-form', validLoginForm);

      expect(userSettingsRepository.create).not.toHaveBeenCalled();
      expect(userSettingsRepository.save).toHaveBeenCalledWith({
        userId: 1,
        loginFormConfig: validLoginForm,
        aframeViewConfig: { some: 'other-view-data' },
      });
    });
  });
});
