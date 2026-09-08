import { BadRequestException } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  const userSettingsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const settingsViewRepository = {
    findOne: jest.fn(),
  };
  let service: UserSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserSettingsService(
      userSettingsRepository as any,
      settingsViewRepository as any,
    );
  });

  describe('getConfig', () => {
    it('throws on an unknown view', async () => {
      await expect(service.getConfig(1, 'not-a-view', 'web')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(settingsViewRepository.findOne).not.toHaveBeenCalled();
      expect(userSettingsRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws on an unknown device type', async () => {
      await expect(
        service.getConfig(1, 'login-form', 'tablet'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(settingsViewRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws when the known view has no row in the settings_views catalog', async () => {
      settingsViewRepository.findOne.mockResolvedValue(null);
      await expect(service.getConfig(1, 'login-form', 'web')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userSettingsRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null when the user has no saved row for that view/device', async () => {
      settingsViewRepository.findOne.mockResolvedValue({ id: 7, viewKey: 'login-form' });
      userSettingsRepository.findOne.mockResolvedValue(null);
      expect(await service.getConfig(1, 'login-form', 'web')).toBeNull();
      expect(userSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, viewId: 7, deviceType: 'web' },
      });
    });

    it('returns the saved config for the requested view and device', async () => {
      const config = { position: [0, 1.6, 1], distanceFactor: 2.7 };
      settingsViewRepository.findOne.mockResolvedValue({ id: 7, viewKey: 'login-form' });
      userSettingsRepository.findOne.mockResolvedValue({
        userId: 1,
        viewId: 7,
        deviceType: 'mobile',
        config,
      });
      expect(await service.getConfig(1, 'login-form', 'mobile')).toEqual(config);
      expect(userSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, viewId: 7, deviceType: 'mobile' },
      });
    });

    it('keeps web and mobile configs independent for the same view', async () => {
      settingsViewRepository.findOne.mockResolvedValue({ id: 7, viewKey: 'login-form' });
      userSettingsRepository.findOne.mockResolvedValue({
        userId: 1,
        viewId: 7,
        deviceType: 'web',
        config: { position: [0, 0, 0], distanceFactor: 1 },
      });
      await service.getConfig(1, 'login-form', 'web');
      expect(userSettingsRepository.findOne).toHaveBeenLastCalledWith({
        where: { userId: 1, viewId: 7, deviceType: 'web' },
      });

      await service.getConfig(1, 'login-form', 'mobile');
      expect(userSettingsRepository.findOne).toHaveBeenLastCalledWith({
        where: { userId: 1, viewId: 7, deviceType: 'mobile' },
      });
    });
  });

  describe('saveConfig', () => {
    const validLoginForm = { position: [0, 1.6, 1], distanceFactor: 2.7 };

    it('throws on an unknown view', async () => {
      await expect(
        service.saveConfig(1, 'not-a-view', validLoginForm, 'web'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws on an unknown device type', async () => {
      await expect(
        service.saveConfig(1, 'login-form', validLoginForm, 'tablet'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws on a config that does not match the shape of the view', async () => {
      await expect(
        service.saveConfig(1, 'login-form', { position: [0, 1] }, 'web'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(settingsViewRepository.findOne).not.toHaveBeenCalled();
      expect(userSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws when the known view has no row in the settings_views catalog', async () => {
      settingsViewRepository.findOne.mockResolvedValue(null);
      await expect(
        service.saveConfig(1, 'login-form', validLoginForm, 'web'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('creates a new row when the user never saved that view/device before', async () => {
      settingsViewRepository.findOne.mockResolvedValue({ id: 7, viewKey: 'login-form' });
      userSettingsRepository.findOne.mockResolvedValue(null);
      const created = { userId: 1, viewId: 7, deviceType: 'web' };
      userSettingsRepository.create.mockReturnValue(created);
      userSettingsRepository.save.mockResolvedValue(created);

      const result = await service.saveConfig(1, 'login-form', validLoginForm, 'web');

      expect(userSettingsRepository.create).toHaveBeenCalledWith({
        userId: 1,
        viewId: 7,
        deviceType: 'web',
      });
      expect(userSettingsRepository.save).toHaveBeenCalledWith({
        userId: 1,
        viewId: 7,
        deviceType: 'web',
        config: validLoginForm,
      });
      expect(result).toEqual(validLoginForm);
    });

    it('updates the existing row instead of creating a second one', async () => {
      settingsViewRepository.findOne.mockResolvedValue({ id: 7, viewKey: 'login-form' });
      const existing = {
        userId: 1,
        viewId: 7,
        deviceType: 'web',
        config: { position: [0, 0, 0], distanceFactor: 1 },
      };
      userSettingsRepository.findOne.mockResolvedValue(existing);
      userSettingsRepository.save.mockResolvedValue(existing);

      await service.saveConfig(1, 'login-form', validLoginForm, 'web');

      expect(userSettingsRepository.create).not.toHaveBeenCalled();
      expect(userSettingsRepository.save).toHaveBeenCalledWith({
        userId: 1,
        viewId: 7,
        deviceType: 'web',
        config: validLoginForm,
      });
    });

    it('does not overwrite the web config when saving the mobile one', async () => {
      settingsViewRepository.findOne.mockResolvedValue({ id: 7, viewKey: 'login-form' });
      userSettingsRepository.findOne.mockResolvedValue(null);
      const created = { userId: 1, viewId: 7, deviceType: 'mobile' };
      userSettingsRepository.create.mockReturnValue(created);
      userSettingsRepository.save.mockResolvedValue(created);

      await service.saveConfig(1, 'login-form', validLoginForm, 'mobile');

      expect(userSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, viewId: 7, deviceType: 'mobile' },
      });
      expect(userSettingsRepository.create).toHaveBeenCalledWith({
        userId: 1,
        viewId: 7,
        deviceType: 'mobile',
      });
    });
  });
});
