import { SongIngestionController } from './song-ingestion.controller';

describe('SongIngestionController', () => {
  const songIngestionService = {
    lyricsFromYoutube: jest.fn(),
    downloadVideo: jest.fn(),
    downloadVideoToDevice: jest.fn(),
  };
  let controller: SongIngestionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SongIngestionController(songIngestionService as any);
  });

  it('delegates lyricsFromYoutube to the service with the DTO', async () => {
    songIngestionService.lyricsFromYoutube.mockResolvedValue({ status: 'success', count: 2 });

    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      archivo: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
    };
    const result = await controller.lyricsFromYoutube(dto as any);

    expect(songIngestionService.lyricsFromYoutube).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: 'success', count: 2 });
  });

  it('delegates downloadVideo to the service with the DTO and the authenticated user id', async () => {
    songIngestionService.downloadVideo.mockResolvedValue({ status: 'success', created: false });

    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      title: 'Always',
      author: 'Bon Jovi',
    };
    const user = { id: 31 } as any;
    const result = await controller.downloadVideo(dto as any, user);

    expect(songIngestionService.downloadVideo).toHaveBeenCalledWith(dto, 31);
    expect(result).toEqual({ status: 'success', created: false });
  });

  it('streams the file back with X-File-Name header for downloadVideoToDevice', async () => {
    songIngestionService.downloadVideoToDevice.mockResolvedValue({
      fileName: 'Always-Bon-Jovi.mp4',
      filePath: '/tmp/always.mp4',
    });

    const dto = { youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA' };
    const user = { id: 31 } as any;
    const res = {
      setHeader: jest.fn(),
      sendFile: jest.fn((_path, cb) => cb()),
    };

    await controller.downloadVideoToDevice(dto as any, user, res as any);

    expect(songIngestionService.downloadVideoToDevice).toHaveBeenCalledWith(dto, 31);
    expect(res.setHeader).toHaveBeenCalledWith('X-File-Name', encodeURIComponent('Always-Bon-Jovi.mp4'));
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
    expect(res.sendFile).toHaveBeenCalledWith('/tmp/always.mp4', expect.any(Function));
  });
});
