import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LyricsFromYoutubeDto } from './lyrics-from-youtube.dto';

describe('LyricsFromYoutubeDto', () => {
  const valid = {
    youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    archivo: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
  };

  it('accepts a valid payload', async () => {
    const dto = plainToInstance(LyricsFromYoutubeDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing youtubeUrl', async () => {
    const dto = plainToInstance(LyricsFromYoutubeDto, { archivo: valid.archivo });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'youtubeUrl')).toBe(true);
  });

  it('rejects a missing archivo', async () => {
    const dto = plainToInstance(LyricsFromYoutubeDto, { youtubeUrl: valid.youtubeUrl });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'archivo')).toBe(true);
  });

  it('rejects an empty youtubeUrl', async () => {
    const dto = plainToInstance(LyricsFromYoutubeDto, { ...valid, youtubeUrl: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'youtubeUrl')).toBe(true);
  });
});
