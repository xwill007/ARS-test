import { PhrasesController } from './phrases.controller';

describe('PhrasesController', () => {
  const phrasesService = {
    findBySongFile: jest.fn(),
  };
  let controller: PhrasesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PhrasesController(phrasesService as any);
  });

  it('delegates to the service with the archivo query param and maps the response', async () => {
    phrasesService.findBySongFile.mockResolvedValue([
      {
        id: 1,
        spanish: 'Cuando la noche ha llegado',
        english: 'When the night has come',
        songId: 1,
      },
    ]);

    const result = await controller.getPhrases('StandByMe_BenEKing.mp4');

    expect(phrasesService.findBySongFile).toHaveBeenCalledWith(
      'StandByMe_BenEKing.mp4',
    );
    expect(result).toEqual({
      status: 'success',
      phrases: [
        {
          espanol_frase: 'Cuando la noche ha llegado',
          ingles_frase: 'When the night has come',
        },
      ],
    });
  });

  it('treats a missing archivo param as an empty string', async () => {
    phrasesService.findBySongFile.mockResolvedValue([]);

    await controller.getPhrases(undefined);

    expect(phrasesService.findBySongFile).toHaveBeenCalledWith('');
  });
});
