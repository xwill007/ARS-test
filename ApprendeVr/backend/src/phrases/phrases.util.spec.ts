import { toPhraseDto } from './phrases.util';

describe('phrases.util', () => {
  describe('toPhraseDto', () => {
    it('maps spanish/english to espanol_frase/ingles_frase', () => {
      expect(
        toPhraseDto({
          id: 1,
          spanish: 'Cuando la noche ha llegado',
          english: 'When the night has come',
          time: '00:00:03',
        }),
      ).toEqual({
        id_frase: 1,
        espanol_frase: 'Cuando la noche ha llegado',
        ingles_frase: 'When the night has come',
        tiempo_frase: '00:00:03',
      });
    });

    it('defaults tiempo_frase to null when the phrase has no time', () => {
      expect(
        toPhraseDto({
          id: 1,
          spanish: 'Cuando la noche ha llegado',
          english: 'When the night has come',
        }),
      ).toEqual({
        id_frase: 1,
        espanol_frase: 'Cuando la noche ha llegado',
        ingles_frase: 'When the night has come',
        tiempo_frase: null,
      });
    });
  });
});
