import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;
  const ENV_KEYS = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'CORS_ORIGIN',
  ];

  beforeEach(() => {
    process.env = { ...originalEnv };
    ENV_KEYS.forEach((key) => delete process.env[key]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('falls back to sane defaults when nothing is set', () => {
    expect(configuration()).toEqual({
      port: 3001,
      database: {
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '',
        name: 'english_vr',
      },
      jwt: { secret: 'change-me', expiresIn: '7d' },
      corsOrigin: true,
    });
  });

  it('reads every value from the environment when present', () => {
    process.env.PORT = '4000';
    process.env.DB_HOST = 'db.internal';
    process.env.DB_PORT = '3307';
    process.env.DB_USER = 'app';
    process.env.DB_PASS = 'secret';
    process.env.DB_NAME = 'testdb';
    process.env.JWT_SECRET = 'super-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.CORS_ORIGIN = 'https://example.com';

    expect(configuration()).toEqual({
      port: 4000,
      database: {
        host: 'db.internal',
        port: 3307,
        username: 'app',
        password: 'secret',
        name: 'testdb',
      },
      jwt: { secret: 'super-secret', expiresIn: '1h' },
      corsOrigin: 'https://example.com',
    });
  });
});
