import { sanitizeUser } from './sanitize-user.util';

describe('sanitizeUser', () => {
  it('removes the password field', () => {
    const result = sanitizeUser({ id: 1, email: 'a@b.com', password: 'hash' });
    expect(result).toEqual({ id: 1, email: 'a@b.com' });
  });

  it('does not mutate the original object', () => {
    const user = { id: 1, email: 'a@b.com', password: 'hash' };
    sanitizeUser(user);
    expect(user.password).toBe('hash');
  });

  it('keeps every other field untouched', () => {
    const user = {
      id: 1,
      email: 'a@b.com',
      password: 'hash',
      name: 'A',
      level: 'basico',
    };
    expect(sanitizeUser(user)).toEqual({
      id: 1,
      email: 'a@b.com',
      name: 'A',
      level: 'basico',
    });
  });
});
