import { BadRequestException } from '@nestjs/common';
import { YoutubeSearchController } from './youtube-search.controller';

describe('YoutubeSearchController', () => {
  const youtubeSearchService = { search: jest.fn() };
  let controller: YoutubeSearchController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new YoutubeSearchController(youtubeSearchService as any);
  });

  it('throws BadRequestException when q is missing', () => {
    expect(() => controller.search(undefined)).toThrow(BadRequestException);
    expect(youtubeSearchService.search).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when q is blank', () => {
    expect(() => controller.search('   ')).toThrow(BadRequestException);
    expect(youtubeSearchService.search).not.toHaveBeenCalled();
  });

  it('delegates to the service with the trimmed query', async () => {
    const results = [{ videoId: 'abc', title: 'T', thumbnailUrl: '', channelTitle: 'C' }];
    youtubeSearchService.search.mockResolvedValue(results);

    const result = await controller.search('  Stand By Me  ');

    expect(youtubeSearchService.search).toHaveBeenCalledWith('Stand By Me');
    expect(result).toBe(results);
  });
});
