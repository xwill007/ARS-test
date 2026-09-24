import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSongDto } from './create-song.dto';

describe('CreateSongDto', () => {
  it('accepts a valid payload with all fields', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      author: 'Ben E King',
      fileName: 'StandByMe_BenEKing.mp4',
      language: 'ingles',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a payload without the optional author and language', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: 'StandByMe_BenEKing.mp4',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an empty title', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: '',
      fileName: 'StandByMe_BenEKing.mp4',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects a missing title', async () => {
    const dto = plainToInstance(CreateSongDto, {
      fileName: 'StandByMe_BenEKing.mp4',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects an empty fileName', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fileName')).toBe(true);
  });

  it('rejects a missing fileName', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fileName')).toBe(true);
  });

  it('rejects a non-string language', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: 'StandByMe_BenEKing.mp4',
      language: 123,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'language')).toBe(true);
  });

  it('accepts a payload with source "youtube" and fileName as a URL', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
      source: 'youtube',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts the optional url field (origin URL, provider-agnostic)', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: 'StandByMe_BenEKing.mp4',
      source: 'server',
      url: 'https://vimeo.com/123456',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-string url', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: 'StandByMe_BenEKing.mp4',
      url: 123,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'url')).toBe(true);
  });

  it('rejects a source outside the known list', async () => {
    const dto = plainToInstance(CreateSongDto, {
      title: 'Stand By Me',
      fileName: 'StandByMe_BenEKing.mp4',
      source: 'spotify',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'source')).toBe(true);
  });
});
