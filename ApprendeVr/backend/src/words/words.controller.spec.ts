import { WordsController } from './words.controller';

describe('WordsController', () => {
  const wordsService = {
    findBySongFile: jest.fn(),
  };
  let controller: WordsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WordsController(wordsService as any);
  });

  it('delegates to the service with the archivo query param and maps the response', async () => {
    wordsService.findBySongFile.mockResolvedValue([
      { id: 1, spanish: 'noche', english: 'night', songId: 1 },
    ]);

    const result = await controller.getWords('StandByMe_BenEKing.mp4');

    expect(wordsService.findBySongFile).toHaveBeenCalledWith(
      'StandByMe_BenEKing.mp4',
    );
    expect(result).toEqual({
      status: 'success',
      words: [{ esp_palabra: 'noche', ing_palabra: 'night' }],
    });
  });

  it('treats a missing archivo param as an empty string', async () => {
    wordsService.findBySongFile.mockResolvedValue([]);

    await controller.getWords(undefined);

    expect(wordsService.findBySongFile).toHaveBeenCalledWith('');
  });
});
