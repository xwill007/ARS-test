import { UsersController } from './users.controller';

describe('UsersController', () => {
  it('returns the current user without the password', () => {
    const controller = new UsersController();
    const user = {
      id: 1,
      name: 'A',
      email: 'a@b.com',
      password: 'hash',
      level: '',
      date: new Date('2024-01-01'),
    };

    const result = controller.getMe(user as any);

    expect(result).not.toHaveProperty('password');
    expect(result).toEqual({
      id: 1,
      name: 'A',
      email: 'a@b.com',
      level: '',
      date: user.date,
    });
  });
});
