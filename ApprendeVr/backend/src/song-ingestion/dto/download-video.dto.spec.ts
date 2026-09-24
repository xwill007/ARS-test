import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DownloadVideoDto } from './download-video.dto';

describe('DownloadVideoDto', () => {
  const valid = {
    youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    title: 'Always',
    author: 'Bon Jovi',
  };

  it('accepts a valid payload without optional fields', async () => {
    const dto = plainToInstance(DownloadVideoDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a payload without title/author (derived from archivo at runtime)', async () => {
    const dto = plainToInstance(DownloadVideoDto, {
      youtubeUrl: valid.youtubeUrl,
      archivo: valid.youtubeUrl,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts the optional archivo field', async () => {
    const dto = plainToInstance(DownloadVideoDto, { ...valid, archivo: valid.youtubeUrl });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing youtubeUrl', async () => {
    const dto = plainToInstance(DownloadVideoDto, { title: valid.title, author: valid.author });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'youtubeUrl')).toBe(true);
  });
});
