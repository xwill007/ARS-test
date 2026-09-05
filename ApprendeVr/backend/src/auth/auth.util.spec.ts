import { buildJwtPayload, normalizeEmail } from './auth.util';

describe('normalizeEmail', () => {
  it('lowercases the email', () => {
    expect(normalizeEmail('User@Example.com')).toBe('user@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('is idempotent on an already-normalized email', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});

describe('buildJwtPayload', () => {
  it('maps id to sub and keeps email', () => {
    expect(buildJwtPayload({ id: 42, email: 'user@example.com' })).toEqual({
      sub: 42,
      email: 'user@example.com',
    });
  });

  it('ignores extra properties on the input', () => {
    const input = { id: 1, email: 'a@b.com', password: 'hash', name: 'A' };
    expect(buildJwtPayload(input)).toEqual({ sub: 1, email: 'a@b.com' });
  });
});
