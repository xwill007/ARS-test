import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveUserSettingDto } from './save-user-setting.dto';

describe('SaveUserSettingDto', () => {
  it('accepts a valid object payload', async () => {
    const dto = plainToInstance(SaveUserSettingDto, {
      config: { position: [0, 1.6, 1], distanceFactor: 2.7 },
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing config', async () => {
    const dto = plainToInstance(SaveUserSettingDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'config')).toBe(true);
  });

  it('rejects an empty object config', async () => {
    const dto = plainToInstance(SaveUserSettingDto, { config: {} });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'config')).toBe(true);
  });

  it('rejects a non-object config', async () => {
    const dto = plainToInstance(SaveUserSettingDto, { config: 'nope' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'config')).toBe(true);
  });
});
