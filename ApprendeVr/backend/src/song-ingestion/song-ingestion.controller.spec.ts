import { SongIngestionController } from './song-ingestion.controller';

describe('SongIngestionController', () => {
  const songIngestionService = {
    lyricsFromYoutube: jest.fn(),
    downloadVideo: jest.fn(),
    downloadVideoToDevice: jest.fn(),
    fetchLyricsFromLrclib: jest.fn(),
    applyLyricsSync: jest.fn(),
    createSongFromYoutube: jest.fn(),
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

  it('delegates createSongFromYoutube to the service with the DTO and the authenticated user id', async () => {
    songIngestionService.createSongFromYoutube.mockResolvedValue({
      status: 'success',
      song: { id: 1 },
      created: true,
      lyrics: { count: 2, words: 9, source: 'youtube' },
    });

    const dto = {
      youtubeUrl: 'https://www.youtube.com/watch?v=9BMwcO6_hyA',
      sourceMode: 'download',
      title: 'Always',
      author: 'Bon Jovi',
    };
    const user = { id: 31 } as any;
    const result = await controller.fromYoutube(dto as any, user);

    expect(songIngestionService.createSongFromYoutube).toHaveBeenCalledWith(dto, 31);
    expect(result).toEqual({
      status: 'success',
      song: { id: 1 },
      created: true,
      lyrics: { count: 2, words: 9, source: 'youtube' },
    });
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

  it('delegates lyricsFromLrclib to the service with the DTO', async () => {
    songIngestionService.fetchLyricsFromLrclib.mockResolvedValue({
      status: 'success',
      stagedCount: 2,
      comparison: { assignments: [], mismatches: [] },
    });

    const dto = { archivo: 'Its-My-Life-Bon-Jovi.mp4' };
    const result = await controller.lyricsFromLrclib(dto as any);

    expect(songIngestionService.fetchLyricsFromLrclib).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: 'success', stagedCount: 2, comparison: { assignments: [], mismatches: [] } });
  });

  it('delegates applyLyricsSync to the service with the DTO', async () => {
    songIngestionService.applyLyricsSync.mockResolvedValue({
      status: 'success',
      appliedTimes: 3,
      insertedPhrases: 1,
      skippedMismatches: 0,
    });

    const dto = { archivo: 'Its-My-Life-Bon-Jovi.mp4', acceptMismatches: true };
    const result = await controller.applyLyricsSync(dto as any);

    expect(songIngestionService.applyLyricsSync).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      status: 'success',
      appliedTimes: 3,
      insertedPhrases: 1,
      skippedMismatches: 0,
    });
  });
});
