import { ServiceUnavailableException } from '@nestjs/common';
import { YoutubeSearchService } from './youtube-search.service';

describe('YoutubeSearchService', () => {
  let configService: { get: jest.Mock };
  let service: YoutubeSearchService;
  const originalFetch = (global as any).fetch;

  beforeEach(() => {
    configService = { get: jest.fn() };
    service = new YoutubeSearchService(configService as any);
    jest.clearAllMocks();
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it('throws ServiceUnavailableException when no API key is configured, without calling the API', async () => {
    configService.get.mockReturnValue('');
    const fetchSpy = jest.fn();
    (global as any).fetch = fetchSpy;

    await expect(service.search('hola')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns normalized results on a successful response', async () => {
    configService.get.mockReturnValue('test-key');
    const raw = {
      items: [
        {
          id: { kind: 'youtube#video', videoId: 'abc123' },
          snippet: {
            title: 'Stand By Me',
            channelTitle: 'Ben E King',
            thumbnails: { medium: { url: 'https://img/med.jpg' } },
          },
        },
      ],
    };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(raw),
    });

    const result = await service.search('stand by me');

    expect(result).toEqual([
      { videoId: 'abc123', title: 'Stand By Me', thumbnailUrl: 'https://img/med.jpg', channelTitle: 'Ben E King' },
    ]);
  });

  it('throws ServiceUnavailableException when the API responds with an error status', async () => {
    configService.get.mockReturnValue('test-key');
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(service.search('hola')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when the network request fails', async () => {
    configService.get.mockReturnValue('test-key');
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(service.search('hola')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns [] when the API returns an empty items array', async () => {
    configService.get.mockReturnValue('test-key');
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] }),
    });

    await expect(service.search('nada')).resolves.toEqual([]);
  });
});
