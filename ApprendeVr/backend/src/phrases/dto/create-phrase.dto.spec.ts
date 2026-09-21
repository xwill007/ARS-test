import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePhraseDto } from './create-phrase.dto';

describe('CreatePhraseDto', () => {
  const valid = {
    archivo: 'ItsMyLife_BonJovi.mp4',
    ingles_frase: "It's my life",
    espanol_frase: 'Es mi vida',
  };

  it('accepts a valid phrase without tiempo_frase', async () => {
    const dto = plainToInstance(CreatePhraseDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a valid optional tiempo_frase', async () => {
    const dto = plainToInstance(CreatePhraseDto, { ...valid, tiempo_frase: '00:00:16.5' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing required field', async () => {
    const dto = plainToInstance(CreatePhraseDto, { ingles_frase: 'Hello', espanol_frase: 'Hola' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'archivo')).toBe(true);
  });

  it('rejects an empty phrase text', async () => {
    const dto = plainToInstance(CreatePhraseDto, { ...valid, ingles_frase: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'ingles_frase')).toBe(true);
  });

  it('rejects an invalid tiempo_frase format', async () => {
    const dto = plainToInstance(CreatePhraseDto, { ...valid, tiempo_frase: '16.5' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tiempo_frase')).toBe(true);
  });
});
