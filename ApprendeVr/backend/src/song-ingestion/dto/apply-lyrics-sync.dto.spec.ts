import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApplyLyricsSyncDto } from './apply-lyrics-sync.dto';

describe('ApplyLyricsSyncDto', () => {
  const valid = { archivo: 'Its-My-Life-Bon-Jovi.mp4' };

  it('accepts a valid payload without acceptMismatches', async () => {
    const dto = plainToInstance(ApplyLyricsSyncDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts acceptMismatches=true', async () => {
    const dto = plainToInstance(ApplyLyricsSyncDto, { ...valid, acceptMismatches: true });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-boolean acceptMismatches', async () => {
    const dto = plainToInstance(ApplyLyricsSyncDto, { ...valid, acceptMismatches: 'yes' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'acceptMismatches')).toBe(true);
  });

  it('rejects a missing archivo', async () => {
    const dto = plainToInstance(ApplyLyricsSyncDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'archivo')).toBe(true);
  });
});
