import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('accepts a valid payload without level', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Ana',
      email: 'ana@b.com',
      password: 'secret123',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts an optional level string', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Ana',
      email: 'ana@b.com',
      password: 'secret123',
      level: 'basico',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an empty name', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: '',
      email: 'ana@b.com',
      password: 'secret123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Ana',
      email: 'ana@b.com',
      password: '123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects an invalid email', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Ana',
      email: 'not-an-email',
      password: 'secret123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
