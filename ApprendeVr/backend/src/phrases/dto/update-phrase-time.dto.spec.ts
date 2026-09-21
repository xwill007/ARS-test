import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePhraseTimeDto } from './update-phrase-time.dto';

describe('UpdatePhraseTimeDto', () => {
  it('accepts a valid HH:MM:SS time', async () => {
    const dto = plainToInstance(UpdatePhraseTimeDto, { time: '00:00:03' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a valid HH:MM:SS.d time (one decimal)', async () => {
    const dto = plainToInstance(UpdatePhraseTimeDto, { time: '00:00:03.5' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing time', async () => {
    const dto = plainToInstance(UpdatePhraseTimeDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'time')).toBe(true);
  });

  it('rejects a time with an invalid format', async () => {
    for (const bad of ['3', '00:00', '0:0:3', '00:00:03.55', 'aa:bb:cc', '00:00:03:00']) {
      const dto = plainToInstance(UpdatePhraseTimeDto, { time: bad });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'time')).toBe(true);
    }
  });

  it('rejects a non-string time', async () => {
    const dto = plainToInstance(UpdatePhraseTimeDto, { time: 3 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'time')).toBe(true);
  });
});
