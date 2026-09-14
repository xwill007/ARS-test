import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSongDto } from './update-song.dto';

describe('UpdateSongDto', () => {
  it('accepts an empty payload (no fields to update)', async () => {
    const dto = plainToInstance(UpdateSongDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a partial payload with a single field', async () => {
    const dto = plainToInstance(UpdateSongDto, { title: 'New Title' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a payload with all fields', async () => {
    const dto = plainToInstance(UpdateSongDto, {
      title: 'Stand By Me',
      author: 'Ben E King',
      fileName: 'StandByMe_BenEKing.mp4',
      language: 'ingles',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an empty title when provided', async () => {
    const dto = plainToInstance(UpdateSongDto, { title: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects an empty fileName when provided', async () => {
    const dto = plainToInstance(UpdateSongDto, { fileName: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fileName')).toBe(true);
  });

  it('rejects a non-string language', async () => {
    const dto = plainToInstance(UpdateSongDto, { language: 123 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'language')).toBe(true);
  });
});
