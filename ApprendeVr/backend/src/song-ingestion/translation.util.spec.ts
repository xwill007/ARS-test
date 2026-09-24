import { translateText } from './translation.util';

describe('translation.util', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs to LibreTranslate /translate and returns the translated text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: 'Este Romeo está sangrando' }),
    }) as any;

    const result = await translateText(
      'http://localhost:5000',
      'This Romeo is bleeding',
      'en',
      'es',
    );

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'This Romeo is bleeding',
        source: 'en',
        target: 'es',
        format: 'text',
      }),
    });
    expect(result).toBe('Este Romeo está sangrando');
  });

  it('throws when the service returns a non-2xx status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;

    await expect(
      translateText('http://localhost:5000', 'hello', 'en', 'es'),
    ).rejects.toThrow('TRANSLATION_FAILED (500)');
  });

  it('throws when the response has no translatedText', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as any;

    await expect(
      translateText('http://localhost:5000', 'hello', 'en', 'es'),
    ).rejects.toThrow('TRANSLATION_FAILED');
  });
});
