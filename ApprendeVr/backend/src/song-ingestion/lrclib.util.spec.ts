import { parseLrcToLines } from './lrclib.util';

describe('lrclib.util', () => {
  describe('parseLrcToLines', () => {
    it('parses a typical LRC with one timestamp per line', () => {
      const lrc =
        '[00:38.54]This Romeo is bleeding\n' +
        '[00:43.18]But you can\'t see his blood\n';
      expect(parseLrcToLines(lrc)).toEqual([
        { text: 'This Romeo is bleeding', startTime: 38.54 },
        { text: "But you can't see his blood", startTime: 43.18 },
      ]);
    });

    it('skips metadata lines and empty/instrumental lines', () => {
      const lrc =
        '[ti:Always]\n[ar:Bon Jovi]\n[00:10.00]First line\n[00:20.00]\n[00:30.00]♪\n';
      expect(parseLrcToLines(lrc)).toEqual([{ text: 'First line', startTime: 10 }]);
    });

    it('repeats the text for multiple timestamps on the same line', () => {
      const lrc = '[00:10.00][00:20.50]Repeated\n';
      expect(parseLrcToLines(lrc)).toEqual([
        { text: 'Repeated', startTime: 10 },
        { text: 'Repeated', startTime: 20.5 },
      ]);
    });

    it('sorts lines by start time', () => {
      const lrc = '[00:30.00]Last\n[00:05.00]First\n[00:15.00]Middle\n';
      const lines = parseLrcToLines(lrc);
      expect(lines.map((l) => l.startTime)).toEqual([5, 15, 30]);
    });

    it('returns [] for empty input', () => {
      expect(parseLrcToLines('')).toEqual([]);
      expect(parseLrcToLines(null as any)).toEqual([]);
    });

    it('handles timestamps without a fractional part', () => {
      const lrc = '[00:38]This Romeo is bleeding\n';
      expect(parseLrcToLines(lrc)).toEqual([
        { text: 'This Romeo is bleeding', startTime: 38 },
      ]);
    });
  });
});
