import { toPhraseDto } from './phrases.util';

describe('phrases.util', () => {
  describe('toPhraseDto', () => {
    it('maps spanish/english to espanol_frase/ingles_frase', () => {
      expect(
        toPhraseDto({
          spanish: 'Cuando la noche ha llegado',
          english: 'When the night has come',
        }),
      ).toEqual({
        espanol_frase: 'Cuando la noche ha llegado',
        ingles_frase: 'When the night has come',
      });
    });
  });
});
