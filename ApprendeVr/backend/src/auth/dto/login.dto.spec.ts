import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'a@b.com',
      password: 'secret123',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an invalid email', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 'secret123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects an empty password', async () => {
    const dto = plainToInstance(LoginDto, { email: 'a@b.com', password: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
