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
        time: '00:00:03',
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
          tiempo_frase: '00:00:03',
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
