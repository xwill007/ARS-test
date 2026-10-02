import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFromYoutubeDto } from './create-from-youtube.dto';

describe('CreateFromYoutubeDto', () => {
  const valid = {
    youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    sourceMode: 'download',
    title: 'Always',
    author: 'Bon Jovi',
  };

  it('accepts a valid download payload', async () => {
    const dto = plainToInstance(CreateFromYoutubeDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a valid stream payload without author', async () => {
    const dto = plainToInstance(CreateFromYoutubeDto, {
      youtubeUrl: valid.youtubeUrl,
      sourceMode: 'stream',
      title: valid.title,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an invalid sourceMode', async () => {
    const dto = plainToInstance(CreateFromYoutubeDto, {
      ...valid,
      sourceMode: 'nope',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sourceMode')).toBe(true);
  });

  it('rejects a missing youtubeUrl', async () => {
    const dto = plainToInstance(CreateFromYoutubeDto, {
      sourceMode: valid.sourceMode,
      title: valid.title,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'youtubeUrl')).toBe(true);
  });

  it('rejects a missing title', async () => {
    const dto = plainToInstance(CreateFromYoutubeDto, {
      youtubeUrl: valid.youtubeUrl,
      sourceMode: valid.sourceMode,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });
});
