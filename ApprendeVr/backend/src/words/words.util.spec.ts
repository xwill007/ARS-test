import { toWordDto } from './words.util';

describe('words.util', () => {
  describe('toWordDto', () => {
    it('maps spanish/english to esp_palabra/ing_palabra', () => {
      expect(toWordDto({ spanish: 'noche', english: 'night' })).toEqual({
        esp_palabra: 'noche',
        ing_palabra: 'night',
      });
    });
  });
});
