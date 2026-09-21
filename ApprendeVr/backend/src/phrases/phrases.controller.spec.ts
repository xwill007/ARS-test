import { NotFoundException } from '@nestjs/common';
import { PhrasesController } from './phrases.controller';

describe('PhrasesController', () => {
  const phrasesService = {
    findBySongFile: jest.fn(),
    updateTime: jest.fn(),
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
          id_frase: 1,
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

  describe('updateTime', () => {
    it('delegates to the service and maps the updated phrase', async () => {
      phrasesService.updateTime.mockResolvedValue({
        id: 1,
        spanish: 'Cuando la noche ha llegado',
        english: 'When the night has come',
        time: '00:00:05',
      });

      const result = await controller.updateTime('1', { time: '00:00:05' });

      expect(phrasesService.updateTime).toHaveBeenCalledWith(1, '00:00:05');
      expect(result).toEqual({
        status: 'success',
        phrase: {
          id_frase: 1,
          espanol_frase: 'Cuando la noche ha llegado',
          ingles_frase: 'When the night has come',
          tiempo_frase: '00:00:05',
        },
      });
    });

    it('throws NotFoundException when the phrase does not exist', async () => {
      phrasesService.updateTime.mockResolvedValue(null);

      await expect(
        controller.updateTime('999', { time: '00:00:05' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
