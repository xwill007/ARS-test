import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LyricsFromLrclibDto } from './lyrics-from-lrclib.dto';

describe('LyricsFromLrclibDto', () => {
  const valid = { archivo: 'Its-My-Life-Bon-Jovi.mp4' };

  it('accepts a valid payload', async () => {
    const dto = plainToInstance(LyricsFromLrclibDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts optional artistName/trackName', async () => {
    const dto = plainToInstance(LyricsFromLrclibDto, {
      ...valid,
      artistName: 'Bon Jovi',
      trackName: "It's My Life",
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing archivo', async () => {
    const dto = plainToInstance(LyricsFromLrclibDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'archivo')).toBe(true);
  });

  it('rejects an empty archivo', async () => {
    const dto = plainToInstance(LyricsFromLrclibDto, { archivo: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'archivo')).toBe(true);
  });
});
